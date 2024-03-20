const express = require ('express');
const cors = require ('cors');
const mysql = require('mysql');
const jwt = require('jsonwebtoken')
const app = express();

app.use(express.json())
app.use(cors())

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password:"",
    database:"leave_app",
})
// Add a route to increase leave
app.post("/increaseCasualLeave", (req, res) => {
    const { employeeId, difference } = req.body;
    const updateQuery = "UPDATE employee_table SET casual_leave = casual_leave + ? WHERE Id = ?";
    db.query(updateQuery, [difference, employeeId], (error, results) => {
      if (error) {
        console.error('Error increasing casual leave:', error);
        res.status(500).json({ error: 'Error increasing casual leave. Please try again.' });
      } else {
        console.log('Casual leave increased successfully:', results);
        res.status(200).json({ message: 'Casual leave increased successfully.' });
      }
    });
  });
  app.put("/approveLeave", (req, res) => {
    const { ID } = req.body;
    const updateQuery = "UPDATE leave_table SET Approval = 1 WHERE ID = ?";
    db.query(updateQuery, [ID], (error, results) => {
      if (error) {
        console.error('Error approving leave:', error);
        res.status(500).json({ error: 'Error approving leave. Please try again.' });
      } else {
        console.log('Leave approved successfully:', results);
        res.status(200).json({ message: 'Leave approved successfully.' });
      }
    });
  });
  
  app.post("/approveAndIncreaseCasualLeave", (req, res) => {
    const { employeeId, difference, ID } = req.body;
    
    // Start a transaction
    db.beginTransaction((err) => {
      if (err) {
        console.error('Error starting transaction:', err);
        res.status(500).json({ error: 'Error starting transaction. Please try again.' });
        return;
      }
  
      const updateEmployeeQuery = "UPDATE employee_table SET casual_leave = casual_leave + ? WHERE Id = ?";
      db.query(updateEmployeeQuery, [difference, employeeId], (error1, result1) => {
        if (error1) {
          console.error('Error updating casual_leave:', error1);
          // Rollback the transaction if an error occurs
          db.rollback(() => {
            res.status(500).json({ error: 'Error updating casual_leave. Please try again.' });
          });
          return;
        }
  
        const updateLeaveQuery = "UPDATE leave_table SET Approval = 1 WHERE ID = ?";
        db.query(updateLeaveQuery, [ID], (error2, result2) => {
          if (error2) {
            console.error('Error updating Approval:', error2);
            // Rollback the transaction if an error occurs
            db.rollback(() => {
              res.status(500).json({ error: 'Error updating Approval. Please try again.' });
            });
            return;
          }
  
          // Commit the transaction if both updates are successful
          db.commit((commitError) => {
            if (commitError) {
              console.error('Error committing transaction:', commitError);
              // Rollback the transaction if an error occurs during commit
              db.rollback(() => {
                res.status(500).json({ error: 'Error committing transaction. Please try again.' });
              });
              return;
            }
            
            console.log('Transaction committed successfully.');
            res.status(200).json({ message: 'Casual leave increased and leave approved successfully.' });
          });
        });
      });
    });
  });
  
app.get("/",(req,res)=>{
    const sql = "SELECT * FROM employee_table";
    db.query(sql , (err,data)=>{
        if(err) return res.json(err);
        return res.json(data);
    })
})
// Add a new route to fetch leave data with approval status 0
app.get("/pendingLeave", (req, res) => {
    const sql = `
    SELECT 
        leave_table.*, 
        employee_table.Name AS EmployeeName, 
        leave_Type_Table.label AS LeaveTypeLabel 
    FROM 
        leave_table 
    INNER JOIN 
        employee_table ON leave_table.Employee_Id = employee_table.Id 
    INNER JOIN 
        leave_Type_Table ON leave_table.Leave_Type_Id = leave_Type_Table.id 
    WHERE 
        leave_table.approval = 0
`;
    db.query(sql, (err, data) => {
        if (err) return res.status(500).json({ error: 'Error fetching pending leave data.' });
        return res.status(200).json(data);
    });
});
app.get("/leaveType",(req,res)=>{
    const sql = "SELECT * FROM leave_Type_Table";
    db.query(sql , (err,data)=>{
        if(err) return res.json(err);
        return res.json(data);
    })
})
app.post("/login",(req,res)=>{
    const sql = "SELECT * FROM employee_table WHERE `email`=? AND `password`=?";
    db.query(sql ,[req.body.email,req.body.password], (err,data)=>{
        if(err) return res.json(err);
        if (data.length > 0 ){
            const email = data[0].email
            const token = jwt.sign({email}, "secretKey", {expiresIn: 300} )
            return res.json({ status: 'success', user: data[0],token });
        }else{
            return res.json({ status: 'failed', message: 'Invalid email or password' });
        }
    })
})
db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
    } else {
        console.log('Connected to MySQL database');
    }
});
app.post("/signup", (req, res) => {
    console.log('signup entry');
    console.log(req.body);
    const values =  
        [
            req.body.name,
            req.body.designation,
            req.body.email,
            req.body.section,
            req.body.phone,
            req.body.password,
            
        ]
    // res.send('this is sign up');
    console.log(values);
    
    // Perform the necessary database operations here
    // Example: Inserting data into a 'users' table
    const query = "INSERT INTO employee_table (`Name` , `designation` , `email`, `section`, `phone` , `password`) VALUES (?)";
    db.query(query, [values], (error, results) => {
      if (error) {
        console.error('Error during signup:', error);
        res.status(500).json({ error: 'Error during signup. Please try again.' });
      } else {
        console.log('User signed up successfully:', results);
        res.status(200).json({ message: 'User signed up successfully.' });
      }
    });
  });
app.post("/leave", (req, res) => {
    console.log('leave entry');
    console.log(req.body);
    const values =  
        [
            req.body.employee_Id,
            req.body.leave_Type_Id,
            req.body.startDate,
            req.body.endDate,
            req.body.cause,
            req.body.approval,
            req.body.assigned_Employee_Id,
            req.body.difference,
            
        ]
    // res.send('this is sign up');
    console.log(values);
    
    // Perform the necessary database operations here
    // Example: Inserting data into a 'users' table
    const query = "INSERT INTO leave_table (`Employee_Id` , `Leave_Type_Id` , `Date_To`, `Date_From`, `Cause` , `Approval` , `Assigned_Employee_Id` , `Difference`) VALUES (?)";
    db.query(query, [values], (error, results) => {
        console.log(results);
        if (error) {
        console.error('Error during signup:', error);
        res.status(500).json({ error: 'Error during signup. Please try again.' });
      } else {
        console.log('Data inserted successfully:', results);
        
        // Querying data for the specific employee
        const selectQuery = "SELECT * FROM employee_table WHERE Id = ?";
        db.query(selectQuery, [values[0]], (selectError, selectResults) => {
            if (selectError) {
                console.error('Error during query:', selectError);
                res.status(500).json({ error: 'Error during query. Please try again.' });
            } else {
                if (selectResults.length === 0) {
                    res.status(404).json({ message: 'No data found for the employee Id provided.' });
                } else {
                    console.log('Data retrieved successfully:', selectResults);
                    res.status(200).json(selectResults[0]);
                }
            }
        });
    }
    });
  });
app.listen(8081,()=>{
    console.log('listening');
})
