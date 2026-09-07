const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '.env') });

const { initializeDatabase } = require('./src/database');

async function updateUserAccess() {
  await initializeDatabase();
  const { users } = require('./src/database').getDatabase();
  
  // Create a premium test user directly
  const testUser = {
    _id: 'test-premium-user-' + Date.now(),
    name: 'Test Premium',
    email: 'testprem@appmentoria.com',
    password: 'hashed_password_here',
    plan: 'premium',
    subscriptionStatus: 'active',
    billingDocument: '11144477735',
    whatsapp: '',
    area: '',
    goal: '',
    weekly_goal_hours: 20,
    access: { blocked: false, type: 'premium', reason: null },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  try {
    const result = await users.insert(testUser);
    console.log('✅ Premium test user created!');
    console.log('User ID:', testUser._id);
    console.log('Email:', testUser.email);
    console.log('Plan:', testUser.plan);
  } catch (err) {
    console.log('User may exist, trying to find and update...');
  }
  
  process.exit(0);
}

updateUserAccess().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
