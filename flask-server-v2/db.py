from motor.motor_asyncio import AsyncIOMotorClient
from credentials import MONGO_URI, dbName
import asyncio
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("vocab_db")

# Create MongoDB client
try:
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[dbName]
    logger.info(f"MongoDB connection established to database: {dbName}")
except Exception as e:
    logger.error(f"Failed to connect to MongoDB: {str(e)}")
    raise

# Validate connection function
async def validate_connection():
    try:
        # The ismaster command is cheap and does not require auth
        await client.admin.command('ismaster')
        logger.info("MongoDB connection validated")
        return True
    except Exception as e:
        logger.error(f"MongoDB connection validation failed: {str(e)}")
        return False
