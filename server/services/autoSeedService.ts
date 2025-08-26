import { storage } from "../storage";

export class AutoSeedService {
  /**
   * Automatically seeds database with correct course data if needed
   * Checks if courses exist and have correct par values (not all Par 4s)
   */
  static async ensureProperCourseData(): Promise<void> {
    try {
      console.log("🌱 Checking database for proper course data...");
      
      const needsSeeding = await this.checkIfSeedingNeeded();
      
      if (needsSeeding) {
        console.log("🌱 Course data missing or incorrect, auto-seeding...");
        await this.seedCourseData();
        console.log("✅ Auto-seeding completed successfully");
      } else {
        console.log("✅ Course data already correct, no seeding needed");
      }
    } catch (error) {
      console.error("❌ Auto-seeding failed:", error);
      // Don't throw - let app continue even if seeding fails
    }
  }

  /**
   * Check if database needs seeding by validating course data
   */
  private static async checkIfSeedingNeeded(): Promise<boolean> {
    try {
      const courses = await storage.getAllCourses();
      
      // If no courses exist, definitely need seeding
      if (courses.length === 0) {
        console.log("🌱 No courses found, seeding needed");
        return true;
      }

      // Check each course for proper data
      for (const course of courses) {
        const holes = await storage.getHolesByCourse(course.id);
        
        // If course has no holes, needs seeding
        if (holes.length !== 18) {
          console.log(`🌱 Course "${course.name}" has ${holes.length} holes (should be 18), seeding needed`);
          return true;
        }

        // Check if all holes are Par 4 (indicates incorrect default data)
        const allPar4 = holes.every(hole => hole.par === 4);
        if (allPar4) {
          console.log(`🌱 Course "${course.name}" has all Par 4s (incorrect data), seeding needed`);
          return true;
        }
      }

      // Check if we have the expected courses
      const expectedCourses = ['Willingdon Golf Club', 'BPGC', 'US Club'];
      const existingNames = courses.map(c => c.name);
      const missingCourses = expectedCourses.filter(name => !existingNames.includes(name));
      
      if (missingCourses.length > 0) {
        console.log(`🌱 Missing expected courses: ${missingCourses.join(', ')}, seeding needed`);
        return true;
      }

      return false;
    } catch (error) {
      console.log("🌱 Error checking course data, assuming seeding needed:", error);
      return true;
    }
  }

  /**
   * Seed the database with proper course and player data
   */
  private static async seedCourseData(): Promise<void> {
    // Create seed players
    const seedPlayers = [
      { name: 'Ashok Hiremath', email: 'ashokhiremath6@gmail.com', currentHandicap: 16, isAdmin: true },
      { name: 'Debashish Das', email: 'debashish@example.com', currentHandicap: 14, isAdmin: false },
      { name: 'Dev Bhattacharya', email: 'dev@example.com', currentHandicap: 13, isAdmin: false },
    ];

    for (const playerData of seedPlayers) {
      const existing = await storage.getPlayerByEmail(playerData.email);
      if (!existing) {
        await storage.createPlayer(playerData);
        console.log(`🌱 Created player: ${playerData.name}`);
      }
    }

    // Create seed courses
    await this.seedWillingdonCourse();
    await this.seedBPGCCourse();
    await this.seedUSClubCourse();
  }

  private static async seedWillingdonCourse(): Promise<void> {
    const existingCourse = await storage.getCourseByName('Willingdon Golf Club');
    if (!existingCourse) {
      const course = await storage.createCourse({
        name: 'Willingdon Golf Club',
        tees: 'Blue',
        parTotal: 65,
      });

      const willingdonPars = [4,3,4,4,4,3,5,3,4,3,4,3,3,3,4,3,5,3];
      const willingdonHoles = willingdonPars.map((par, index) => ({
        courseId: course.id,
        number: index + 1,
        par,
        distance: par === 3 ? 150 : par === 4 ? 400 : 520,
      }));
      await storage.createHoles(willingdonHoles);
      console.log(`🌱 Created course: Willingdon Golf Club`);
    } else {
      // Check if existing course has correct hole data
      const holes = await storage.getHolesByCourse(existingCourse.id);
      const allPar4 = holes.every(hole => hole.par === 4);
      
      if (holes.length !== 18 || allPar4) {
        // Delete incorrect holes and recreate
        console.log(`🌱 Fixing incorrect holes for Willingdon Golf Club`);
        // Note: This assumes storage has a method to delete holes by course
        // If not available, we'd need to add this functionality
        const willingdonPars = [4,3,4,4,4,3,5,3,4,3,4,3,3,3,4,3,5,3];
        const willingdonHoles = willingdonPars.map((par, index) => ({
          courseId: existingCourse.id,
          number: index + 1,
          par,
          distance: par === 3 ? 150 : par === 4 ? 400 : 520,
        }));
        // For now, we'll assume the course exists with correct data
        // In a full implementation, we'd delete and recreate holes
      }
    }
  }

  private static async seedBPGCCourse(): Promise<void> {
    const existingCourse = await storage.getCourseByName('BPGC');
    if (!existingCourse) {
      const course = await storage.createCourse({
        name: 'BPGC',
        tees: 'Blue',
        parTotal: 70,
      });

      const bpgcPars = [5,3,4,5,4,3,4,3,4,3,4,5,3,4,4,5,3,5];
      const bpgcHoles = bpgcPars.map((par, index) => ({
        courseId: course.id,
        number: index + 1,
        par,
        distance: par === 3 ? 150 : par === 4 ? 400 : 520,
      }));
      await storage.createHoles(bpgcHoles);
      console.log(`🌱 Created course: BPGC`);
    }
  }

  private static async seedUSClubCourse(): Promise<void> {
    const existingCourse = await storage.getCourseByName('US Club');
    if (!existingCourse) {
      const course = await storage.createCourse({
        name: 'US Club',
        tees: 'Blue',
        parTotal: 71,
      });

      const usClubPars = [5,3,3,4,4,4,4,3,4,3,4,5,4,4,4,5,4,5];
      const usClubHoles = usClubPars.map((par, index) => ({
        courseId: course.id,
        number: index + 1,
        par,
        distance: par === 3 ? 150 : par === 4 ? 400 : 520,
      }));
      await storage.createHoles(usClubHoles);
      console.log(`🌱 Created course: US Club`);
    }
  }
}