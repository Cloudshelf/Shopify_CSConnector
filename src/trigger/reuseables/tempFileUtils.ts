import { logger, wait } from '@trigger.dev/sdk';
import axios from 'axios';
import { createWriteStream, promises as fsPromises } from 'fs';
import * as stream from 'stream';
import { ulid } from 'ulid';
import { promisify } from 'util';

const finished = promisify(stream.finished);

export async function downloadTempFile(dataUrl: string, tempFilePath?: string, maxRetries = 3): Promise<string> {
    const tempFile = tempFilePath || `/tmp/${ulid()}.jsonl`;
    logger.info(`Downloading data url: ${dataUrl} to ${tempFile}`);

    let lastError: any;
    let retryDelaySeconds = 5;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const writer = createWriteStream(tempFile);

        try {
            await axios.get(dataUrl, { responseType: 'stream', timeout: 60000 }).then(response => {
                response.data.pipe(writer);
                return finished(writer);
            });

            logger.info(`Successfully downloaded data to ${tempFile} on attempt ${attempt}`);
            return tempFile;
        } catch (error) {
            lastError = error;
            writer.destroy();

            if (attempt < maxRetries) {
                logger.warn(
                    `Failed to download data from ${dataUrl} on attempt ${attempt}/${maxRetries}, retrying in ${retryDelaySeconds} seconds...`,
                    error,
                );

                try {
                    await fsPromises.unlink(tempFile);
                } catch (unlinkError) {
                    // Ignore error if file doesn't exist
                }

                await wait.for({ seconds: retryDelaySeconds });
                retryDelaySeconds *= 2;
            } else {
                logger.error(`Failed to download data from ${dataUrl} after ${maxRetries} attempts`, error);
            }
        }
    }

    throw lastError;
}

export async function deleteTempFile(tempFilePath: string): Promise<void> {
    try {
        logger.info(`Deleting temp file: ${tempFilePath}`);
        await fsPromises.unlink(tempFilePath);
        logger.info(`Successfully deleted temp file: ${tempFilePath}`);
    } catch (error) {
        logger.error(`Failed to delete temp file: ${tempFilePath}`, error);
    }
}
