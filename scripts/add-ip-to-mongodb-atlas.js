const axios = require('axios');

// Substitua pelos valores da sua API Key e Project ID
const PUBLIC_KEY = 'sua_public_key';
const PRIVATE_KEY = 'sua_private_key';
const PROJECT_ID = 'seu_project_id';

// IP a ser liberado (use '0.0.0.0/0' para liberar todos os IPs)
const IP_ADDRESS = 'SEU_IP/32';

// URL da API do MongoDB Atlas
const BASE_URL = `https://cloud.mongodb.com/api/atlas/v1.0/groups/${PROJECT_ID}/accessList`;

async function addIpToMongoDBAtlas() {
  try {
    const auth = Buffer.from(`${PUBLIC_KEY}:${PRIVATE_KEY}`).toString('base64');

    const response = await axios.post(
      BASE_URL,
      [{ ipAddress: IP_ADDRESS, comment: 'Liberado automaticamente via script' }],
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('IP liberado com sucesso:', response.data);
  } catch (error) {
    console.error('Erro ao liberar IP:', error.response ? error.response.data : error.message);
  }
}

addIpToMongoDBAtlas();