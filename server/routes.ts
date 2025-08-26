import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { handicapService } from "./services/handicapService";
import { importService } from "./services/importService";
import { calculateRoundScores } from "./services/golfCalculations";
import { z } from "zod";
import { insertPlayerSchema, insertCourseSchema, insertHoleSchema, insertRoundSchema } from "@shared/schema";

// Validation schemas
const createRoundSchema = insertRoundSchema.extend({
  rawScores: z.array(z.number().min(1).max(10)).length(18),
});

const importRoundsSchema = z.object({
  csvData: z.string(),
  autoCreatePlayers: z.boolean().default(false),
  autoCreateCourses: z.boolean().default(false),
});

const handicapRecalcSchema = z.object({
  window: z.enum(['previous', 'current', 'specific']),
  month: z.string().optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      
      // Get the auth user
      const user = await storage.getUser(userId);
      
      // Try to find matching player profile by email
      const player = await storage.getPlayerByEmail(userEmail);
      
      // Return user data with linked player information
      const response = {
        ...user,
        linkedPlayer: player || null,
        isLinkedToPlayer: !!player
      };
      
      res.json(response);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Player routes
  app.get('/api/players', async (req, res) => {
    try {
      const players = await storage.getAllPlayers();
      res.json(players);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch players" });
    }
  });

  app.get('/api/players/:id', async (req, res) => {
    try {
      const player = await storage.getPlayer(req.params.id);
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }
      res.json(player);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch player" });
    }
  });

  app.post('/api/players', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const userEmail = req.user.claims.email;
      const player = await storage.getPlayerByEmail(userEmail || '');
      
      if (!player?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validatedData = insertPlayerSchema.parse(req.body);
      const newPlayer = await storage.createPlayer(validatedData);
      res.status(201).json(newPlayer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create player" });
    }
  });

  app.put('/api/players/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user.claims.email;
      const player = await storage.getPlayerByEmail(userEmail || '');
      
      if (!player?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validatedData = insertPlayerSchema.partial().parse(req.body);
      const updatedPlayer = await storage.updatePlayer(req.params.id, validatedData);
      res.json(updatedPlayer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update player" });
    }
  });

  app.delete('/api/players/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user.claims.email;
      const player = await storage.getPlayerByEmail(userEmail || '');
      
      if (!player?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.deletePlayer(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete player" });
    }
  });

  // Course routes
  app.get('/api/courses', async (req, res) => {
    try {
      const courses = await storage.getAllCourses();
      res.json(courses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  app.get('/api/courses/:id', async (req, res) => {
    try {
      const course = await storage.getCourse(req.params.id);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      res.json(course);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });

  app.get('/api/courses/:id/holes', async (req, res) => {
    try {
      console.log("🏌️ SERVER DEBUG - Course ID:", req.params.id);
      const holes = await storage.getHolesByCourse(req.params.id);
      console.log("🏌️ SERVER DEBUG - Holes from DB:", holes.slice(0, 5).map(h => ({hole: h.number, par: h.par})));
      res.json(holes);
    } catch (error) {
      console.error("🏌️ SERVER ERROR:", error);
      res.status(500).json({ message: "Failed to fetch holes" });
    }
  });

  app.post('/api/courses', isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user.claims.email;
      const player = await storage.getPlayerByEmail(userEmail || '');
      
      if (!player?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validatedData = insertCourseSchema.parse(req.body);
      const newCourse = await storage.createCourse(validatedData);
      res.status(201).json(newCourse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create course" });
    }
  });

  // Update course (admin only)
  app.put('/api/courses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user.claims.email;
      const player = await storage.getPlayerByEmail(userEmail || '');
      
      if (!player?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const courseId = req.params.id;
      const existingCourse = await storage.getCourse(courseId);
      if (!existingCourse) {
        return res.status(404).json({ message: "Course not found" });
      }

      const validatedData = insertCourseSchema.parse(req.body);
      const updatedCourse = await storage.updateCourse(courseId, validatedData);
      res.json(updatedCourse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error('Error updating course:', error);
      res.status(500).json({ message: "Failed to update course" });
    }
  });

  // Delete course (admin only)
  app.delete('/api/courses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user.claims.email;
      const player = await storage.getPlayerByEmail(userEmail || '');
      
      if (!player?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const courseId = req.params.id;
      const existingCourse = await storage.getCourse(courseId);
      if (!existingCourse) {
        return res.status(404).json({ message: "Course not found" });
      }

      // Check if course has any rounds
      const courseRounds = await storage.getAllRounds();
      const hasRounds = courseRounds.some((round: any) => round.courseId === courseId);
      
      if (hasRounds) {
        return res.status(400).json({ 
          message: "Cannot delete course with existing rounds. Delete all rounds first." 
        });
      }

      await storage.deleteCourse(courseId);
      res.json({ message: "Course deleted successfully" });
    } catch (error) {
      console.error('Error deleting course:', error);
      res.status(500).json({ message: "Failed to delete course" });
    }
  });

  // Update hole (admin only)
  app.put('/api/holes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user.claims.email;
      const player = await storage.getPlayerByEmail(userEmail || '');
      
      if (!player?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { par, distance } = req.body;
      if (par && (par < 3 || par > 5)) {
        return res.status(400).json({ message: "Par must be between 3 and 5" });
      }
      
      if (distance && (distance < 50 || distance > 700)) {
        return res.status(400).json({ message: "Distance must be between 50 and 700 yards" });
      }

      const updatedHole = await storage.updateHole(req.params.id, { par, distance });
      res.json(updatedHole);
    } catch (error) {
      console.error('Error updating hole:', error);
      res.status(500).json({ message: "Failed to update hole" });
    }
  });

  // Round routes
  app.get('/api/rounds', async (req, res) => {
    try {
      const { month, playerId } = req.query;
      let rounds;
      
      if (playerId) {
        rounds = await storage.getRoundsByPlayer(
          playerId as string, 
          month as string | undefined
        );
      } else {
        rounds = await storage.getAllRounds(month as string | undefined);
      }
      
      res.json(rounds);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch rounds" });
    }
  });

  app.post('/api/rounds', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = createRoundSchema.parse(req.body);
      
      // Get the authenticated user's linked player
      const userEmail = req.user.claims.email;
      const authenticatedPlayer = await storage.getPlayerByEmail(userEmail || '');
      
      if (!authenticatedPlayer) {
        return res.status(404).json({ 
          message: "Player profile not found. Please contact admin to set up your account." 
        });
      }
      
      // Use the authenticated player's ID (ignore any playerId from request for security)
      const player = authenticatedPlayer;

      // Get course and holes for calculations
      const course = await storage.getCourse(validatedData.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      const holes = await storage.getHolesByCourse(course.id);
      if (holes.length !== 18) {
        return res.status(400).json({ message: "Course must have 18 holes configured" });
      }

      const holePars = holes.sort((a, b) => a.number - b.number).map(h => h.par);
      
      // Calculate round scores
      const scoreCalculation = calculateRoundScores(
        validatedData.rawScores,
        holePars,
        validatedData.courseHandicap,
        course.parTotal
      );

      // Create complete round data using authenticated player
      const roundData = {
        ...validatedData,
        playerId: player.id, // Always use authenticated player's ID
        cappedScores: scoreCalculation.cappedScores,
        grossCapped: scoreCalculation.grossCapped,
        net: scoreCalculation.net,
        overPar: scoreCalculation.overPar.toString(),
      };

      const newRound = await storage.createRound(roundData);
      res.status(201).json(newRound);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create round" });
    }
  });

  // Update round (admin only)
  app.put('/api/rounds/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user.claims.email;
      const player = await storage.getPlayerByEmail(userEmail || '');
      
      if (!player?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const roundId = req.params.id;
      const existingRound = await storage.getRound(roundId);
      if (!existingRound) {
        return res.status(404).json({ message: "Round not found" });
      }

      // Validate only rawScores for now (partial update)
      const { rawScores } = req.body;
      if (!Array.isArray(rawScores) || rawScores.length !== 18) {
        return res.status(400).json({ message: "Must provide exactly 18 scores" });
      }

      if (!rawScores.every(score => Number.isInteger(score) && score >= 1 && score <= 10)) {
        return res.status(400).json({ message: "All scores must be integers between 1 and 10" });
      }

      // Get course and holes for recalculation
      const course = await storage.getCourse(existingRound.courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      const holes = await storage.getHolesByCourse(course.id);
      if (holes.length !== 18) {
        return res.status(400).json({ message: "Course must have 18 holes configured" });
      }

      const holePars = holes.sort((a, b) => a.number - b.number).map(h => h.par);
      
      // Recalculate round scores with new raw scores
      const scoreCalculation = calculateRoundScores(
        rawScores,
        holePars,
        existingRound.courseHandicap,
        course.parTotal
      );

      // Update round with recalculated values
      const updatedRound = await storage.updateRound(roundId, {
        rawScores: rawScores,
        cappedScores: scoreCalculation.cappedScores,
        grossCapped: scoreCalculation.grossCapped,
        net: scoreCalculation.net,
        overPar: scoreCalculation.overPar.toString(),
      } as any);

      res.json(updatedRound);
    } catch (error) {
      console.error('Error updating round:', error);
      res.status(500).json({ message: "Failed to update round" });
    }
  });

  // Delete round (admin only)
  app.delete('/api/rounds/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user.claims.email;
      const player = await storage.getPlayerByEmail(userEmail || '');
      
      if (!player?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const roundId = req.params.id;
      const existingRound = await storage.getRound(roundId);
      if (!existingRound) {
        return res.status(404).json({ message: "Round not found" });
      }

      await storage.deleteRound(roundId);
      res.json({ message: "Round deleted successfully" });
    } catch (error) {
      console.error('Error deleting round:', error);
      res.status(500).json({ message: "Failed to delete round" });
    }
  });

  // Leaderboard route
  app.get('/api/leaderboard', async (req, res) => {
    try {
      const leaderboard = await storage.getLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Handicap recalculation routes
  // Handicap recalculation endpoint (supports both GET for cron and POST for manual)
  const handleHandicapRecalculation = async (req: any, res: any) => {
    try {
      const userEmail = req.user.claims.email;
      const player = await storage.getPlayerByEmail(userEmail || '');
      
      if (!player?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { window, month } = handicapRecalcSchema.parse(req.body);
      
      let targetMonth: string | undefined;
      if (window === 'previous') {
        // Use previous month
        targetMonth = undefined;
      } else if (window === 'specific' && month) {
        targetMonth = month;
      }

      const result = await handicapService.runMonthlyRecalculation(targetMonth);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to run handicap recalculation" });
    }
  };

  // POST endpoint for manual recalculation (requires auth)
  app.post('/api/handicaps/apply', isAuthenticated, handleHandicapRecalculation);
  
  // GET endpoint for automated cron job (no auth required for cron)
  app.get('/api/handicaps/apply', async (req, res) => {
    try {
      const window = req.query.window as string || 'previous';
      const month = req.query.month as string;
      
      let targetMonth: string | undefined;
      if (window === 'previous') {
        targetMonth = undefined; // Use previous month
      } else if (window === 'specific' && month) {
        targetMonth = month;
      }

      const result = await handicapService.runMonthlyRecalculation(targetMonth);
      
      // Log the automated recalculation for monitoring
      console.log(`[CRON] Automated handicap recalculation completed for ${result.month}. ${result.playersUpdated} players updated.`);
      
      res.json({
        success: true,
        automated: true,
        ...result
      });
    } catch (error) {
      console.error('[CRON] Automated handicap recalculation failed:', error);
      res.status(500).json({ 
        success: false,
        automated: true,
        message: "Failed to run automated handicap recalculation" 
      });
    }
  });

  app.get('/api/handicaps/summary/:month', async (req, res) => {
    try {
      const summary = await handicapService.getMonthlyUpdateSummary(req.params.month);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch handicap summary" });
    }
  });

  // Get all handicap snapshots
  app.get('/api/handicaps/snapshots', async (req, res) => {
    try {
      const snapshots = await storage.getAllHandicapSnapshots();
      res.json(snapshots);
    } catch (error) {
      console.error('Error fetching handicap snapshots:', error);
      res.status(500).json({ message: "Failed to fetch handicap snapshots" });
    }
  });

  // Export handicap data as CSV
  app.get('/api/handicaps/export', isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user.claims.email;
      const player = await storage.getPlayerByEmail(userEmail || '');
      
      if (!player?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const snapshots = await storage.getAllHandicapSnapshots();
      
      // Create CSV content
      const csvHeader = 'Player,Month,Previous Handicap,Rounds Count,Avg Monthly Over Par,Change,New Handicap,Date\n';
      const csvRows = snapshots.map(snapshot => {
        const avgOverPar = snapshot.avgMonthlyOverPar ? parseFloat(snapshot.avgMonthlyOverPar.toString()).toFixed(1) : 'N/A';
        const delta = parseFloat(snapshot.delta.toString()).toFixed(0);
        const date = new Date(snapshot.createdAt).toLocaleDateString();
        
        return `"${snapshot.playerName}","${snapshot.month}",${snapshot.prevHandicap},${snapshot.roundsCount},"${avgOverPar}","${delta}",${snapshot.newHandicap},"${date}"`;
      }).join('\n');
      
      const csvContent = csvHeader + csvRows;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="handicap-snapshots-${new Date().toISOString().slice(0, 7)}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error('Error exporting handicap data:', error);
      res.status(500).json({ message: "Failed to export handicap data" });
    }
  });

  // Import routes
  app.post('/api/import/rounds', isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user.claims.email;
      const player = await storage.getPlayerByEmail(userEmail || '');
      
      if (!player?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { csvData, autoCreatePlayers, autoCreateCourses } = importRoundsSchema.parse(req.body);
      
      const parsedData = importService.parseCSV(csvData);
      const result = await importService.importRounds(parsedData, {
        autoCreatePlayers,
        autoCreateCourses,
      });
      
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to import rounds" });
    }
  });

  app.get('/api/import/sample-csv', async (req, res) => {
    try {
      const sampleCSV = importService.getSampleCSV();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="sample-rounds.csv"');
      res.send(sampleCSV);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate sample CSV" });
    }
  });

  // Group settings
  app.get('/api/group/settings', async (req, res) => {
    try {
      const settings = await storage.getGroupSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch group settings" });
    }
  });

  app.put('/api/group/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user.claims.email;
      const player = await storage.getPlayerByEmail(userEmail || '');
      
      if (!player?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { groupName } = req.body;
      if (!groupName || typeof groupName !== 'string') {
        return res.status(400).json({ message: "Group name is required" });
      }

      const updatedSettings = await storage.updateGroupSettings({ groupName });
      res.json(updatedSettings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update group settings" });
    }
  });

  // Seed data endpoint (admin access required)
  app.post('/api/seed', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const userEmail = req.user.claims.email;
      const player = await storage.getPlayerByEmail(userEmail || '');
      
      if (!player?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

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
        }
      }

      // Create seed courses
      const willingdonCourse = await storage.getCourseByName('Willingdon Golf Club');
      if (!willingdonCourse) {
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
      }

      const bpgcCourse = await storage.getCourseByName('BPGC');
      if (!bpgcCourse) {
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
      }

      const usClubCourse = await storage.getCourseByName('US Club');
      if (!usClubCourse) {
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
      }

      res.json({ message: "Seed data created successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to seed data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
