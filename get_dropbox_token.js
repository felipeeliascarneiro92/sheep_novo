
import https from 'https';
import fs from 'fs';

const data = new URLSearchParams({
    code: 'oanpVVobXnkAAAAAAAXfm1fzKx8jDchV7VGFxrCSJNc',
    grant_type: 'authorization_code',
    client_id: 'w6ljrnaxcqui396',
    client_secret: '6oyleyem11zydml'
}).toString();

const options = {
    hostname: 'api.dropbox.com',
    path: '/oauth2/token',
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
        responseData += chunk;
    });

    res.on('end', () => {
        console.log('Response:', responseData);
        fs.writeFileSync('dropbox_response.json', responseData);
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.write(data);
req.end();
