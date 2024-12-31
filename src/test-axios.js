const axios = require('axios');

async function testWithAxios() {
    const bugId = 'CXBU-13394';
    const url = `https://freshworks.freshrelease.com/CXBU/issues/${bugId}`;
    
    try {
        const response = await axios({
            method: 'GET',
            url: url,
            headers: {
                'authorization': 'Token 0ivnByQzHN_RBgDlZkV5nQ',
                'x-requested-with': 'XMLHttpRequest'
            }
        });

        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Status:', error.response?.status);
        console.error('Error:', error.response?.data);
    }
}

testWithAxios();