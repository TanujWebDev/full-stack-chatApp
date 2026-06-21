import { v2 as cloudinary } from 'cloudinary';
import {config} from 'dotenv'
import dns from 'node:dns';

config();
dns.setServers(['8.8.8.8', '1.1.1.1']);

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

export default cloudinary;
