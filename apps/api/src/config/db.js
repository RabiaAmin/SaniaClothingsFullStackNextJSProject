const mongoose = require("mongoose");

const connectDB = async () => {
 await  mongoose.connect(process.env.MONGO_URI,{
        dbName: "SANIACLOTHING",

    }).then(() => {
        console.log("Database connected successfully");
    }).catch((error) => {
        console.error("Database connection failed:", error);
        process.exit(1); 
    });
};

module.exports = connectDB;
