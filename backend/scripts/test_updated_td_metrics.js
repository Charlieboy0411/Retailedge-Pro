const User = require('../models/User');
const tdService = require('../utils/tdService');

async function testMetrics() {
  const charles = await User.findOne({ where: { email: 'charles@idonneous.com' } });
  
  console.log('=== TEST METRICS: CURRENT MONTH ===');
  const currentMonthMetrics = await tdService.getTDCapabilityCockpitMetrics(charles, 'all', 'all', 'current_month');
  console.log('KPIs (Current Month):', currentMonthMetrics.kpis);
  console.log('Health:', currentMonthMetrics.health);
  console.log('Attention Required count:', currentMonthMetrics.attentionRequired.length);

  console.log('\n=== TEST METRICS: ALL TIME ===');
  const allTimeMetrics = await tdService.getTDCapabilityCockpitMetrics(charles, 'all', 'all', 'all_time');
  console.log('KPIs (All Time):', allTimeMetrics.kpis);
  console.log('Health:', allTimeMetrics.health);

  console.log('\n=== TEST METRICS: PREVIOUS MONTH ===');
  const prevMonthMetrics = await tdService.getTDCapabilityCockpitMetrics(charles, 'all', 'all', 'previous_month');
  console.log('KPIs (Previous Month):', prevMonthMetrics.kpis);

  process.exit(0);
}

testMetrics().catch(e => {
  console.error(e);
  process.exit(1);
});
