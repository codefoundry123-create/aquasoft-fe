import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

export type UserData = {
  id: string;            // unique identifier for each user
  userName: string;
  userAge: number;
  height: string;
  weightUnit: string;
  waterUnit: string;
  heightUnit: string;
  weight: string;
  gender: string;
  dailyGoal: number;
};

export type WaterLog = {
  id?: number;
  userId: string;
  drunk: number;
  todayGoal: number;
  waterUnit: string;
  time: string;
};


@Injectable({
  providedIn: 'root'
})
export class SqliteService {
  private sqlite: SQLiteConnection;
  private db!: SQLiteDBConnection;

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  /**
   * Initialize database and create table
   */
  async initDB() {
    try {
      await this.sqlite.checkConnectionsConsistency().catch(() => { });
      try {
        this.db = await this.sqlite.retrieveConnection('waterreminderDb', false);
      } catch {
        this.db = await this.sqlite.createConnection('waterreminderDb', false, 'no-encryption', 1, false);
      }

      const isOpen = (await this.db.isDBOpen()).result;
      if (!isOpen) await this.db.open();

      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS user_data (
          id TEXT PRIMARY KEY,
          userName TEXT,
          userAge INTEGER,
          height TEXT,
          weightUnit TEXT,
          waterUnit TEXT,
          heightUnit TEXT,
          weight TEXT,
          gender TEXT,
          dailyGoal INTEGER
        );
      `);

      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS water_record (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT,
          drunk INTEGER,
          todayGoal INTEGER,
          waterUnit TEXT,
          time TEXT,
          FOREIGN KEY (userId) REFERENCES user_data(id)
        );
    `);


      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Add a new user
   */
  async addUser(user: UserData): Promise<number | null> {
    try {
      const result = await this.db.run(
        `INSERT INTO user_data 
         (id, userName, userAge, height, weightUnit, waterUnit, heightUnit, weight, gender, dailyGoal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          user.userName,
          user.userAge,
          user.height,
          user.weightUnit,
          user.waterUnit,
          user.heightUnit,
          user.weight,
          user.gender,
          user.dailyGoal
        ]
      );

      const newId = result.changes?.lastId ?? null;
      return newId;
    } catch (err) {
      return null;
    }
  }

  /**
   * Get one user by ID
   */
  async getUserById(id: string): Promise<UserData | null> {
    try {
      const res = await this.db.query(`SELECT * FROM user_data WHERE id = ?`, [id]);
      const user = res.values?.[0];
      return user ? (user as UserData) : null;
    } catch (err) {
      return null;
    }
  }

  async updateUser(user: UserData): Promise<boolean> {
    try {
      await this.db.run(
        `UPDATE user_data SET 
        userName = ?, 
        userAge = ?, 
        height = ?, 
        weightUnit = ?, 
        waterUnit = ?, 
        heightUnit = ?, 
        weight = ?, 
        gender = ?, 
        dailyGoal = ?
      WHERE id = ?`,
        [
          user.userName,
          user.userAge,
          user.height,
          user.weightUnit,
          user.waterUnit,
          user.heightUnit,
          user.weight,
          user.gender,
          user.dailyGoal,
          user.id
        ]
      );
      return true;
    } catch (err) {
      return false;
    }
  }


  async addWaterLog(waterData: WaterLog): Promise<number | null> {
    try {
      const result = await this.db.run(
        `INSERT INTO water_record(userId, drunk, todayGoal, waterUnit, time)
       VALUES (?, ?, ?, ?, ?)`,
        [waterData.userId, waterData.drunk, waterData.todayGoal, waterData.waterUnit, waterData.time]
      );

      const newId = result.changes?.lastId ?? null;
      return newId;
    } catch (err) {
      return null;
    }
  }


  async getWaterDataByUser(userId: string): Promise<WaterLog[]> {
    try {
      const res = await this.db.query(`SELECT * FROM water_record WHERE userId = ? ORDER BY time DESC`, [userId]);
      return (res.values ?? []) as WaterLog[];
    } catch (err) {
      return [];
    }
  }


  async deleteWaterData(warerId: number): Promise<boolean> {
    try {
      const result = await this.db.run(`DELETE FROM water_record WHERE id = ?`, [warerId]);
      return (result.changes?.changes ?? 0) > 0;
    } catch (err) {
      return false;
    }
  }

  /** CHART DATA FUNCTIONS */

  // Total water drunk for a given date (YYYY-MM-DD)
  async getDailySummary(userId: string, date: string) {
    try {
      const res = await this.db.query(
        `SELECT SUM(drunk) as totalDrunk 
         FROM water_record 
         WHERE userId = ? AND DATE(time) = ?`,
        [userId, date]
      );
      return res.values?.[0]?.totalDrunk ?? 0;
    } catch (err) {
      return 0;
    }
  }

  // Last 7 days summary (group by date)
  async getWeeklySummary(userId: string) {
    try {
      const res = await this.db.query(
        `SELECT DATE(time) as date, SUM(drunk) as totalDrunk 
         FROM water_record 
         WHERE userId = ? AND DATE(time) >= DATE('now', '-6 days')
         GROUP BY DATE(time)
         ORDER BY DATE(time) ASC`,
        [userId]
      );
      return res.values ?? [];
    } catch (err) {
      return [];
    }
  }

  // Monthly summary (group by day of month)
  async getMonthlySummary(userId: string, month: number, year: number) {
    try {
      const start = `${year}-${String(month).padStart(2, '0')}-01`;
      const res = await this.db.query(
        `SELECT DATE(time) as date, SUM(drunk) as totalDrunk 
         FROM water_record 
         WHERE userId = ? AND strftime('%Y-%m', time) = ?
         GROUP BY DATE(time)
         ORDER BY DATE(time) ASC`,
        [userId, `${year}-${String(month).padStart(2, '0')}`]
      );
      return res.values ?? [];
    } catch (err) {
      return [];
    }
  }


  // Yearly summary (sum by month)
  async getYearlySummary(userId: string) {
    try {
      const res = await this.db.query(
        `SELECT strftime('%Y-%m', time) as date, SUM(drunk) as totalDrunk 
         FROM water_record 
         WHERE userId = ? AND strftime('%Y', time) = strftime('%Y', 'now')
         GROUP BY strftime('%Y-%m', time)
         ORDER BY date ASC`,
        [userId]
      );
      return res.values ?? [];
    } catch (err) {
      return [];
    }
  }


  async getAllAverages(userId: string) {
    // Get all water log entries
    const result = await this.db.query(
      'SELECT drunk, time FROM water_record WHERE userId = ? ORDER BY time DESC',
      [userId]
    );

    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    let weekTotal = 0, weekCount = 0;
    let monthTotal = 0, monthCount = 0;
    let yearTotal = 0, yearCount = 0;

    result.values?.forEach((entry: any) => {
      const entryDate = new Date(entry.time);
      const volume = entry.drunk;

      if (entryDate >= oneWeekAgo) {
        weekTotal += volume;
        weekCount++;
      }
      if (entryDate >= oneMonthAgo) {
        monthTotal += volume;
        monthCount++;
      }
      if (entryDate >= oneYearAgo) {
        yearTotal += volume;
        yearCount++;
      }
    });

    return {
      weeklyAverage: weekCount ? weekTotal / 7 : 0,
      monthlyAverage: monthCount ? monthTotal / 30 : 0,
      yearlyAverage: yearCount ? yearTotal / 365 : 0,
    };
  }


  /**
 * Completely delete a user account and all related data
 * @param id user ID to delete
 */
  async deleteAccount(id: string): Promise<boolean> {
    try {
      // Delete all water records for the user
      await this.db.run(`DELETE FROM water_record WHERE userId = ?`, [id]);
      //  Delete the user profile
      await this.db.run(`DELETE FROM user_data WHERE id = ?`, [id]);
      return true;
    } catch (err) {
      return false;
    }
  }

  async closeDB() {
    try {
      const connExists = (await this.sqlite.isConnection('waterreminderDb', false)).result;
      if (connExists) {
        await this.sqlite.closeConnection('waterreminderDb', false);
      }
      return true;
    } catch (err) {
      return false;
    }
  }
}
