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
    const width = parseInt(match[1], 10);
    const height = parseInt(match[2], 10);
    return [width, height, ...match[3].split('.')];
}

module.exports = async (event, context, callback) => {
    const {
        queryStringParameters: { key },
    } = event;

    console.log('Starting new resize, key: ', key);
    const [width, height, name, type] = splitUrl(key);

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

        callback(null, {
            statusCode: '301',
            headers: { location: `${URL}/${key}` },
            body: '',
        });
    } catch (err) {
        console.error(err);
        callback(err);
    }
};

async function tryGetObject(name) {
    const types = ['webp', 'jpg', 'png', 'jpeg'];
    for (let type of types) {
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
