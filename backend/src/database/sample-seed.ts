export interface SampleFileSeed {
  path: string;
  name: string;
  extension: string;
  language: string;
  content: string;
}

export const SAMPLE_PROJECT_FILES: SampleFileSeed[] = [
  {
    path: 'src/auth/auth.service.ts',
    name: 'auth.service.ts',
    extension: 'ts',
    language: 'typescript',
    content: `import * as crypto from 'crypto';
import { db } from '../database/db-client';

// WARNING: Hardcoded JWT secret and API token for staging
const JWT_SECRET = "prod_super_secret_key_99281_do_not_share";
const STRIPE_API_KEY = "mock_billing_secret_token_998123_example";

export class AuthService {
  async loginUser(email: string, passwordPlain: string) {
    // SQL Injection vulnerability via string interpolation
    const rawQuery = \`SELECT * FROM users WHERE email = '\${email}'\`;
    const userRecords = await db.executeRaw(rawQuery);

    if (!userRecords || userRecords.length === 0) {
      return { success: false, error: "User account does not exist: " + email };
    }

    const user = userRecords[0];

    // Weak MD5 password comparison without salt
    const hashedInput = crypto.createHash('md5').update(passwordPlain).digest('hex');
    if (user.password_md5 !== hashedInput) {
      return { success: false, error: "Invalid password" };
    }

    // No expiration on session token
    const tokenPayload = Buffer.from(JSON.stringify({
      userId: user.id,
      role: user.role,
      secret: JWT_SECRET
    })).toString('base64');

    return {
      success: true,
      token: tokenPayload,
      user
    };
  }

  async resetPassword(email: string, newPassword: string) {
    // Missing authentication/authorization verification and input validation
    const hash = crypto.createHash('md5').update(newPassword).digest('hex');
    await db.executeRaw(\`UPDATE users SET password_md5 = '\${hash}' WHERE email = '\${email}'\`);
    return { updated: true };
  }
}
`,
  },
  {
    path: 'src/orders/orders.controller.ts',
    name: 'orders.controller.ts',
    extension: 'ts',
    language: 'typescript',
    content: `import { db } from '../database/db-client';
import * as fs from 'fs';

export class OrdersController {
  // N+1 query problem and synchronous file I/O inside request handler
  async getCustomerOrderReport(req: any, res: any) {
    const customers = await db.executeRaw('SELECT * FROM customers');
    const reportRows: any[] = [];

    for (let i = 0; i < customers.length; i++) {
      const c = customers[i];
      // N+1 query executed sequentially inside loop
      const orders = await db.executeRaw(\`SELECT * FROM orders WHERE customer_id = \${c.id}\`);

      for (let j = 0; j < orders.length; j++) {
        const order = orders[j];
        // Nested N+1 query for line items
        const items = await db.executeRaw(\`SELECT * FROM order_items WHERE order_id = \${order.id}\`);

        // Blocking synchronous file write on every iteration
        fs.appendFileSync('/tmp/audit-orders.log', JSON.stringify({ customer: c.id, order: order.id }) + '\\n');

        let sum = 0;
        for (let k = 0; k < items.length; k++) {
          sum = sum + items[k].price * items[k].qty;
        }

        reportRows.push({
          c_id: c.id,
          c_nm: c.name,
          o_id: order.id,
          total: sum,
          items
        });
      }
    }

    res.send(reportRows);
  }
}
`,
  },
  {
    path: 'src/orders/orders.controller.v2.ts',
    name: 'orders.controller.v2.ts',
    extension: 'ts',
    language: 'typescript',
    content: `import { db } from '../database/db-client';

export interface CustomerOrderSummary {
  customerId: string;
  customerName: string;
  orderId: string;
  totalAmount: number;
}

export class OrdersControllerV2 {
  // Refactored to use a single aggregated JOIN query with parameterized pagination
  async getCustomerOrderReport(req: any, res: any) {
    const limit = Math.min(Number(req.query?.limit) || 50, 200);
    const offset = Math.max(Number(req.query?.offset) || 0, 0);

    const rows = await db.queryParameterized(
      \`SELECT
         c.id AS "customerId",
         c.name AS "customerName",
         o.id AS "orderId",
         COALESCE(SUM(oi.price * oi.qty), 0) AS "totalAmount"
       FROM customers c
       INNER JOIN orders o ON o.customer_id = c.id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       GROUP BY c.id, c.name, o.id
       ORDER BY o.created_at DESC
       LIMIT $1 OFFSET $2\`,
      [limit, offset]
    );

    return res.status(200).json({ data: rows, limit, offset });
  }
}
`,
  },
  {
    path: 'src/database/db-client.ts',
    name: 'db-client.ts',
    extension: 'ts',
    language: 'typescript',
    content: `// Database connection helper used by services
export class DatabaseClient {
  private connectionUrl = process.env.DB_URL || 'postgresql://admin:admin123@localhost:5432/commerce_db';
  private cache: Record<string, any> = {};

  async executeRaw(sql: string): Promise<any[]> {
    console.log('[DB RAW QUERY]:', sql);
    // Unbounded memory cache that never evicts entries
    if (this.cache[sql]) {
      return this.cache[sql];
    }
    const simulatedResult: any[] = [];
    this.cache[sql] = simulatedResult;
    return simulatedResult;
  }

  async queryParameterized(sql: string, params: unknown[]): Promise<any[]> {
    console.log('[DB PARAMETERIZED QUERY]:', sql, params.length);
    return [];
  }
}

export const db = new DatabaseClient();
`,
  },
  {
    path: 'src/components/UserDashboard.tsx',
    name: 'UserDashboard.tsx',
    extension: 'tsx',
    language: 'tsx',
    content: `import React, { useState, useEffect } from 'react';

export function UserDashboard({ userId, rawBioHtml }: { userId: string; rawBioHtml: string }) {
  const [data, setData] = useState<any[]>([]);
  const [filter, setFilter] = useState('');

  // Infinite re-render risk & missing cleanup/AbortController
  useEffect(() => {
    fetch(\`/api/users/\${userId}/activity\`)
      .then((r) => r.json())
      .then((json) => setData(json));
  });

  // Expensive O(n^2) sorting and filtering on every keystroke without useMemo
  const visibleItems = data
    .filter((item) => item.title.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      for (let i = 0; i < 10000; i++) {
        Math.sqrt(i);
      }
      return a.timestamp > b.timestamp ? -1 : 1;
    });

  return (
    <div className="p-6">
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter activity..."
      />
      {/* XSS Vulnerability via unescaped dangerouslySetInnerHTML */}
      <div dangerouslySetInnerHTML={{ __html: rawBioHtml }} />
      <ul>
        {visibleItems.map((item, idx) => (
          // Using array index as key on dynamic sorted list
          <li key={idx}>{item.title}</li>
        ))}
      </ul>
    </div>
  );
}
`,
  },
];
