'use strict';

const AWS = require('aws-sdk');
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

function snipFileType(str) {
    return str.replace(/\.(\w+)$/, '');
}

module.exports = async (event, context, callback) => {
    const {
        queryStringParameters: { key },
    } = event;

    const [width, height, name, type] = splitUrl(key);

    // we make sure we don't call sharp with jpg because the method is called jpeg
    const format = type === 'jpg' ? 'jpeg' : type;

    try {
        const { Body: img } = await S3.getObject({ Bucket: BUCKET, Key: `${name}.${type}` }).promise();

        const buff = await Sharp(img)
            .resize(width, height)
            [format]({ progressive: true })
            .toBuffer();

        await S3.putObject({
            Body: buff,
            Bucket: BUCKET,
            ContentType: `image/${type}`,
            Key: key,
        }).promise();

        // if right file type, make a webp copy
        if (format === 'jpeg' || format === 'png') {
            const webpBuff = await Sharp(img)
                .resize(width, height)
                .webp()
                .toBuffer();

            await S3.putObject({
                Body: webpBuff,
                Bucket: BUCKET,
                ContentType: `image/webp`,
                Key: `${snipFileType(key)}.webp`,
            }).promise();
        }

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
