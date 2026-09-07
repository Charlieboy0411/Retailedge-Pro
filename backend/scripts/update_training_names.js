const Training = require('../models/Training');

async function updateTrainingNames() {
  console.log('Updating demo training module titles...');
  
  const trainings = await Training.findAll({
    where: { title: 'Test Call' },
    order: [['createdAt', 'ASC']]
  });

  console.log(`Found ${trainings.length} trainings titled "Test Call"`);

  const realisticTitles = [
    'Product Knowledge – New Launch',
    'Advanced Sales Conversation',
    'Customer Engagement Essentials'
  ];

  for (let i = 0; i < trainings.length; i++) {
    const t = trainings[i];
    const newTitle = realisticTitles[i % realisticTitles.length];
    await t.update({
      title: newTitle,
      type: 'Meeting',
      description: `Authoritative training module on ${newTitle} for retail capability development.`
    });
    console.log(`Updated training ${t.id} -> "${newTitle}"`);
  }

  console.log('Training titles updated successfully.');
  process.exit(0);
}

updateTrainingNames().catch(err => {
  console.error(err);
  process.exit(1);
});
