const fetch = require('node-fetch');

async function testWithFetch() {
    const bugId = 'CXBU-13394';
    const url = `https://freshworks.freshrelease.com/CXBU/issues/${bugId}`;
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'authorization': 'Token 0ivnByQzHN_RBgDlZkV5nQ',
                'x-requested-with': 'XMLHttpRequest'
            }
        });

        console.log('Status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log('Error:', errorText);
            return;
        }

        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

testWithFetch();