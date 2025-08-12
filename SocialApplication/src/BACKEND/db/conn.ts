import mongoose from 'mongoose'
const dotenv = require("dotenv");
import path from 'path';
const result = dotenv.config({ path: path.resolve(__dirname, '../.env') });

if(result.error){
console.error('Error Loading .env filel');
}else{
    console.log('.env filde loaded successfully');
}
const connectionString = process.env.MONGO_URI || process.env.ATLAS_URI || "";
const connectToDatabase = async () =>{
    try
    {
        console.log("ATLAS_URI:", connectionString);
        await mongoose.connect(connectionString);
        console.log('MongoDB connected')
    }catch(e){
        console.error('Database connection error:',(e))
    }
}
export {connectToDatabase}