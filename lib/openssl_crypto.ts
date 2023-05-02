import crypto from "crypto";
import openssl_config from "./config.json";

const algorithm = openssl_config.OPENSSL_ALGORITHM;
const key = Buffer.from(openssl_config.OPENSSL_KEY, "utf8");
const ivBuffer = Buffer.from(openssl_config.OPENSSL_IV);

const encrypt = (text) => {
    const cipher = crypto.createCipheriv(algorithm, key, ivBuffer);
    return cipher.update(text,'utf8','base64') +  cipher.final('base64')
}

const decrypt = (encryptedText) => {
    const decryptor = crypto.createDecipheriv(algorithm, key, ivBuffer);
    return decryptor.update(encryptedText, 'base64', 'utf8') + decryptor.final('utf8');
};

export {encrypt, decrypt};
