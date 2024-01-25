import { open, stat } from 'fs/promises';

export class JsonLUtils {
    static async *readFileBackwards(filepath: string, { mode = 'r', bufferSize = 1024 } = {}) {
        const fd = await open(filepath, mode);

        let partial: string | undefined = '';
        let { size: position } = await stat(filepath);

        while (position > 0) {
            const length = Math.min(bufferSize, position);

            position -= length;

            // eslint-disable-next-line no-await-in-loop
            const { buffer } = await fd.read(Buffer.alloc(length), 0, length, position);

            const lines: string[] = (buffer.toString() + partial).split('\n').reverse();

            partial = lines.pop();

            for (const line of lines) {
                yield line;
            }
        }

        if (partial) {
            yield partial;
        }

        await fd.close();
    }

    static async *readJsonlChunked(filepath: string, maxObjectInChunk = 50): AsyncGenerator<object[]> {
        let chunkedObjects: any[] = [];
        const childObjects: { [key: string]: any } = {};

        const rl = await JsonLUtils.readFileBackwards(filepath);

        for await (const line of rl) {
            // eslint-disable-next-line no-continue
            if (!line) continue;

            const object = JSON.parse(line);
            const t = /gid:\/\/shopify\/(.*)\/\d/.exec(object.id);
            if (!t) {
                throw new Error('Bad line');
            }
            const [, objectType] = t;

            if (childObjects[object.id]) {
                Object.assign(object, {
                    ...childObjects[object.id],
                });

                delete childObjects[object.id];
            }

            if (object.__parentId) {
                if (!childObjects[object.__parentId]) {
                    childObjects[object.__parentId] = {};
                }

                if (!childObjects[object.__parentId][objectType]) {
                    childObjects[object.__parentId][objectType] = [];
                }

                childObjects[object.__parentId][objectType].push(object);
            }

            if (!object.__parentId) {
                chunkedObjects.push(object);

                if (chunkedObjects.length >= maxObjectInChunk) {
                    yield chunkedObjects;
                    chunkedObjects = [];
                }
            } else {
                delete object.__parentId;
            }
        }

        if (chunkedObjects.length > 0) {
            yield chunkedObjects;
        }
    }

    static async *readJsonl(filepath: string): any {
        const childObjects: { [key: string]: any } = {};

        const rl = await JsonLUtils.readFileBackwards(filepath);

        for await (const line of rl) {
            // eslint-disable-next-line no-continue
            if (!line) continue;

            const object = JSON.parse(line);
            const t = /gid:\/\/shopify\/(.*)\/\d/.exec(object.id);
            if (!t) {
                throw new Error('Bad line');
            }
            const [, objectType] = t;

            if (childObjects[object.id]) {
                Object.assign(object, {
                    ...childObjects[object.id],
                });

                delete childObjects[object.id];
            }

            if (object.__parentId) {
                if (!childObjects[object.__parentId]) {
                    childObjects[object.__parentId] = {};
                }

                if (!childObjects[object.__parentId][objectType]) {
                    childObjects[object.__parentId][objectType] = [];
                }

                childObjects[object.__parentId][objectType].push(object);
            }

            if (!object.__parentId) {
                yield object;
            } else {
                delete object.__parentId;
            }
        }
    }
}
