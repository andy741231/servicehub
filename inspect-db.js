const { PrismaClient } = require('@prisma/client');

// Use production database URL from environment
const productionUrl = process.env.DATABASE_URL_PROD || "sqlserver://houstonservice-test.database.windows.net:1433;database=free-production-servicehub;user=servicehub_prod;password=zM8@nL3wP6!qS9;encrypt=true;trustServerCertificate=false;connectionTimeout=30";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: productionUrl
    }
  }
});

async function inspectDatabase() {
  try {
    console.log('=== DATABASE INSPECTION REPORT ===\n');

    // Test connection
    await prisma.$connect();
    console.log('✓ Connection successful to Azure SQL database\n');

    // Get all tables using raw query
    const tables = await prisma.$queryRaw`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' 
      ORDER BY TABLE_NAME
    `;
    
    console.log('=== TABLES FOUND ===');
    const tableNames = tables.map(t => t.TABLE_NAME);
    tableNames.forEach(name => console.log(`  - ${name}`));
    console.log();

    // Expected tables from Prisma schema
    const expectedTables = [
      'User', 'Role', 'UserRole', 'AppPermission',
      'WebPage', 'WebSection', 'WebBlock',
      'Form', 'FormSubmission',
      'EmailCampaign', 'MailingList', 'Recipient', 'EmailLog', 'CampaignMetrics',
      'WebSiteStyle', 'WebAsset'
    ];

    console.log('=== MISSING TABLES ===');
    const missingTables = expectedTables.filter(t => !tableNames.includes(t));
    if (missingTables.length === 0) {
      console.log('  None - all expected tables present');
    } else {
      missingTables.forEach(t => console.log(`  - ${t}`));
    }
    console.log();

    console.log('=== EXTRA TABLES (not in schema) ===');
    const extraTables = tableNames.filter(t => !expectedTables.includes(t));
    if (extraTables.length === 0) {
      console.log('  None');
    } else {
      extraTables.forEach(t => console.log(`  - ${t}`));
    }
    console.log();

    // Inspect Form table structure in detail
    console.log('=== FORM TABLE STRUCTURE ===');
    const formColumns = await prisma.$queryRaw`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Form'
      ORDER BY ORDINAL_POSITION
    `;

    if (formColumns.length === 0) {
      console.log('  ERROR: Form table not found!');
    } else {
      console.log('  Columns:');
      formColumns.forEach(col => {
        const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
        const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
        const def = col.COLUMN_DEFAULT ? ` DEFAULT ${col.COLUMN_DEFAULT}` : '';
        console.log(`    - ${col.COLUMN_NAME}: ${col.DATA_TYPE}${length} ${nullable}${def}`);
      });
    }
    console.log();

    // Check Form table against expected schema
    console.log('=== FORM TABLE VALIDATION ===');
    const expectedFormColumns = [
      { name: 'id', type: 'uniqueidentifier', nullable: 'NO' },
      { name: 'title', type: 'nvarchar', nullable: 'NO' },
      { name: 'schema', type: 'nvarchar', nullable: 'NO' },
      { name: 'createdAt', type: 'datetime', nullable: 'NO' },
      { name: 'updatedAt', type: 'datetime', nullable: 'NO' },
      { name: 'deletedAt', type: 'datetime', nullable: 'YES' }
    ];

    const formColumnNames = formColumns.map(c => c.COLUMN_NAME);
    const missingFormColumns = expectedFormColumns.filter(c => !formColumnNames.includes(c.name));
    
    if (missingFormColumns.length === 0) {
      console.log('  ✓ All expected columns present');
    } else {
      console.log('  ✗ Missing columns:');
      missingFormColumns.forEach(c => console.log(`    - ${c.name}`));
    }

    // Check for any data in Form table
    const formData = await prisma.$queryRaw`SELECT COUNT(*) as count FROM Form`;
    console.log(`\n  Form table row count: ${formData[0].count}`);

  } catch (error) {
    console.error('Error inspecting database:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

inspectDatabase();
