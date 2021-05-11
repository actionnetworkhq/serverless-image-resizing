'use strict';

const AWS = require('aws-sdk');
const awsUtil = require('../util/aws');
const S3 = new AWS.S3({
    signatureVersion: 'v4',
});

const Sharp = require('sharp');

const BUCKET = process.env.BUCKET;
const URL = process.env.URL;

function splitUrl(str) {
    const match = str.match(/(\d+)x(\d+)\/(.*)/);

    if (!match) {
        log.error(`No match for "${str}"`);
        return false;
    }

    const width = parseInt(match[1], 10);
    const height = parseInt(match[2], 10);
    return [width, height, ...match[3].split('.')];
}

async function fallbackResponse(key) {
    try {
        log.info('Fallback to original item requested');
        const { Body: body } = await S3.getObject({ Bucket: BUCKET, Key: key }).promise();
        if (body) {
            log.info('Fallback item found successfully');
            return {
                statusCode: '200',
                body,
            };
        }
    } catch (e) {
        log.info(`No fallback item found for key: ${key}`);
        return {
            statusCode: '404',
            body: 'Not Found',
        };
    }
};

module.exports = async (event) => {
    const {
        queryStringParameters: { key },
    } = event;

    console.log('Starting new resize, key: ', key);
    const result = splitUrl(key);
    if (!result) {
        return fallbackResponseKey(key);
    }
    const [width, height, name, type] = result;

    // we make sure we don't call sharp with jpg because the method is called jpeg
    const format = type === 'jpg' ? 'jpeg' : type;

    try {
        let img;
        if (type === 'webp') {
            console.log('Getting original webp object..');
            const { Body } = await tryGetObject(name);
            img = Body;
        } else {
            console.log('Getting original object..');
            const { Body } = await S3.getObject({ Bucket: BUCKET, Key: `${name}.${type}` }).promise();
            img = Body;
        }

        console.log('Resizing..');
        const buff = await Sharp(img)
            .resize(width, height)
            [format]({ progressive: true })
            .toBuffer();

        console.log('Creating new object..');
        await S3.putObject({
            Body: buff,
            Bucket: BUCKET,
            ContentType: `image/${type}`,
            Key: key,
            ACL: 'public-read',
            CacheControl: 'max-age=31536000, immutable',
        }).promise();

        // if right file type, make a webp copy
        if (format === 'jpeg' || format === 'png') {
            console.log('Resizing webp..');
            const webpBuff = await Sharp(img)
                .resize(width, height)
                .webp()
                .toBuffer();

            console.log('Creating new webp..');
            await S3.putObject({
                Body: webpBuff,
                Bucket: BUCKET,
                ContentType: `image/webp`,
                Key: `${awsUtil.snipFileType(key)}.webp`,
                ACL: 'public-read',
                CacheControl: 'max-age=31536000, immutable',
            }).promise();
        }

        console.log('Resize complete');

        return {
            statusCode: '301',
            headers: { location: `${URL}/${key}` },
            body: '',
        };
    } catch (err) {
        console.error(err);
        throw err;
    }
};

async function tryGetObject(name) {
    const types = ['webp', 'jpg', 'png', 'jpeg'];
    for (const type of types) {
        try {
            const result = await S3.getObject({ Bucket: BUCKET, Key: `${name}.${type}` }).promise();
            if (result) {
                return result;
            }
        } catch (e) {
            // Eats errors
        }
    }
    throw 'No File Found';
}
