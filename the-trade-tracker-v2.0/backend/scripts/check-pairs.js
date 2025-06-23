/**
 * Script to check trading pairs in the database
 */

const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

async function checkTradingPairs() {
  try {
    // Count total pairs
    const totalCount = await prisma.tradingPair.count();
    console.log(`Total trading pairs in database: ${totalCount}`);

    // Get broker distribution
    const brokerCounts = await prisma.tradingPair.groupBy({
      by: ['brokerName'],
      _count: {
        id: true
      }
    });
    
    console.log('Broker distribution:');
    brokerCounts.forEach(b => {
      console.log(`- ${b.brokerName}: ${b._count.id} pairs`);
    });

    // Get a sample of capital.com pairs
    const capitalPairs = await prisma.tradingPair.findMany({
      where: {
        brokerName: 'capital.com'
      },
      take: 5
    });
    
    console.log(`\nFound ${capitalPairs.length} pairs with broker name exactly 'capital.com'`);
    
    // Try alternative capitalizations of capital.com
    const variants = [
      'Capital.com', 
      'CAPITAL.COM', 
      'capital.com', 
      'Capital', 
      'capital'
    ];
    
    for (const variant of variants) {
      const count = await prisma.tradingPair.count({
        where: {
          brokerName: variant
        }
      });
      console.log(`Pairs with broker name '${variant}': ${count}`);
    }

    // Check if there are any active pairs
    const activePairs = await prisma.tradingPair.count({
      where: {
        isActive: true
      }
    });
    console.log(`\nActive trading pairs: ${activePairs}`);
    
    // Sample of the most recent pairs
    const recentPairs = await prisma.tradingPair.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 3
    });
    
    if (recentPairs.length > 0) {
      console.log('\nMost recent pairs:');
      recentPairs.forEach(pair => {
        console.log(`- ${pair.symbol} (${pair.brokerName}) - isActive: ${pair.isActive}`);
      });
    }
    
  } catch (error) {
    console.error('Error checking trading pairs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkTradingPairs()
  .then(() => console.log('Check complete'))
  .catch(error => console.error('Unhandled error:', error));
