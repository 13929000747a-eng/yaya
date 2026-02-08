
import { Storage } from '@google-cloud/storage';
import { resolve } from 'path';

// Load Service Account
const SERVICE_ACCOUNT_PATH = 'yaya-35423-firebase-adminsdk-fbsvc-7a6cd497f6.json';

async function main() {
    try {
        const keyFilename = resolve(process.cwd(), SERVICE_ACCOUNT_PATH);

        console.log(`Using key file: ${keyFilename}`);
        const storage = new Storage({ keyFilename });

        console.log("Listing buckets...");
        const [buckets] = await storage.getBuckets();

        if (buckets.length === 0) {
            console.log("No buckets found in this project.");
            console.log("Please go to Firebase Console > Storage and click 'Get Started' to create a bucket.");
        } else {
            console.log("Found buckets:");
            buckets.forEach(b => console.log(` - ${b.name}`));
        }

    } catch (error) {
        console.error("Error listing buckets:", error);
    }
}

main();
