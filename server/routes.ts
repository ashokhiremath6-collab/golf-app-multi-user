import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { handicapService } from "./services/handicapService";
import { importService } from "./services/importService";
import { calculateRoundScores } from "./services/golfCalculations";
import { z } from "zod";
import { insertPlayerSchema, insertCourseSchema, insertHoleSchema, insertRoundSchema, insertOrganizationSchema, insertOrganizationAdminSchema, type InsertHole } from "@shared/schema";
import { isPreviewMode, createPreviewResponse } from "./previewMode";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

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

// Preview mode middleware to block write operations (except admin operations)
const isPreviewWriteBlocked = (req: any, res: any, next: any) => {
  if (isPreviewMode() && req.method !== 'GET') {
    // Allow admin operations to proceed even in preview mode
    const adminRoutes = [
      '/api/courses',
      '/api/holes',
      '/api/players',
      '/api/rounds',
      '/api/import',
      '/api/handicaps'
    ];
    
    const isAdminRoute = adminRoutes.some(route => req.path.startsWith(route));
    
    if (!isAdminRoute) {
      return res.status(403).json({ message: "Preview mode: write operations disabled" });
    }
  }
  next();
};

// Organization session management
const ORG_SESSION_SECRET = process.env.ORG_SESSION_SECRET || 'your-org-session-secret-key';
const ORG_SESSION_EXPIRY = '2h'; // 2 hours


// Internal function to check Replit session without triggering redirects
const checkReplitSession = (req: any): boolean => {
  try {
    // Check if session exists and has valid user data
    return !!(req.session?.passport?.user?.claims?.sub);
  } catch (error) {
    return false;
  }
};

// Non-redirecting Replit auth for session issuance
const nonRedirectingAuth = async (req: any, res: any, next: any) => {
  if (checkReplitSession(req)) {
    // Extract user data from session for compatibility
    req.user = req.session.passport.user;
    return next();
  }
  
  // Return structured error instead of redirect
  return res.status(401).json({ 
    message: "Authentication required", 
    code: "AUTH_REQUIRED",
    redirectToLogin: true 
  });
};

// Enhanced auth middleware that prioritizes org tokens
const enhancedAuth = async (req: any, res: any, next: any) => {
  const orgToken = req.cookies?.orgToken || req.headers['x-org-token'];
  
  // First priority: Try org token if present
  if (orgToken) {
    try {
      const decoded = jwt.verify(orgToken, ORG_SESSION_SECRET) as any;
      const orgId = req.params.organizationId || req.params.id || req.path.split('/')[3];
      
      if (decoded.orgId === orgId && decoded.exp > Date.now() / 1000) {
        req.orgSession = decoded;
        req.user = { claims: { sub: decoded.userId, email: decoded.email } };
        return next();
      }
    } catch (error) {
      // Token invalid/expired, signal need for refresh
      return res.status(401).json({ 
        message: "Organization session expired", 
        code: "ORG_TOKEN_EXPIRED",
        requiresRefresh: true 
      });
    }
  }
  
  // Second priority: Check Replit session without triggering redirects
  if (checkReplitSession(req)) {
    // Valid Replit session exists, allow request to proceed
    req.user = req.session?.passport?.user ?? { claims: { sub: 'replit-session' } };
    return next();
  }
  
  // No valid auth, request login
  return res.status(401).json({ 
    message: "Authentication required", 
    code: "AUTH_REQUIRED",
    redirectToLogin: true 
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Preview status endpoint (available before auth setup)
  app.get('/api/preview/status', (req, res) => {
    res.json({ preview: isPreviewMode() });
  });

  // Apply preview write protection globally
  app.use(isPreviewWriteBlocked);

  // Auth middleware - conditionally skip in preview mode
  if (!isPreviewMode()) {
    await setupAuth(app);
  }

  // Auth routes - handle both normal and preview modes
  app.get('/api/auth/user', isPreviewMode() ? (req: any, res: any) => res.json(null) : isAuthenticated, async (req: any, res) => {
    if (isPreviewMode()) {
      return res.json(null);
    }
    
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
      
      res.json(createPreviewResponse(response));
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Stub auth endpoints for preview mode
  if (isPreviewMode()) {
    app.get('/api/login', (req, res) => {
      res.status(200).json({ message: "Preview mode: auth disabled" });
    });
    
    app.get('/api/logout', (req, res) => {
      res.status(200).json({ message: "Preview mode: auth disabled" });
    });
  }

  // Organization session endpoints
  app.post('/api/organizations/:id/session', nonRedirectingAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const organizationId = req.params.id;
      
      // Verify user has access to this organization
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      const isOrgAdmin = await storage.isUserOrganizationAdmin(userId, organizationId);
      const player = await storage.getPlayerByUserIdAndOrganization(userId, organizationId);
      
      if (!isSuperAdmin && !isOrgAdmin && !player) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
      
      // Verify organization exists
      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      // Create organization session token
      const orgSessionData = {
        userId,
        email: userEmail,
        orgId: organizationId,
        orgSlug: organization.slug,
        isAdmin: isSuperAdmin || isOrgAdmin,
        playerId: player?.id || null,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60) // 2 hours
      };
      
      const orgToken = jwt.sign(orgSessionData, ORG_SESSION_SECRET, { expiresIn: ORG_SESSION_EXPIRY });
      
      // Set httpOnly cookie for security
      res.cookie('orgToken', orgToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 2 * 60 * 60 * 1000 // 2 hours
      });
      
      res.json({
        success: true,
        sessionData: {
          orgId: organizationId,
          orgSlug: organization.slug,
          orgName: organization.name,
          isAdmin: orgSessionData.isAdmin,
          playerId: orgSessionData.playerId,
          expiresAt: orgSessionData.exp * 1000
        }
      });
    } catch (error) {
      console.error("Error creating organization session:", error);
      res.status(500).json({ message: "Failed to create organization session" });
    }
  });

  app.delete('/api/organizations/:id/session', (req, res) => {
    // Clear organization session
    res.clearCookie('orgToken');
    res.json({ success: true, message: "Organization session cleared" });
  });

  app.get('/api/organizations/:id/session/verify', enhancedAuth, async (req: any, res) => {
    try {
      const organizationId = req.params.id;
      
      if (req.orgSession) {
        // Return org session data if valid
        res.json({
          valid: true,
          sessionData: {
            orgId: req.orgSession.orgId,
            orgSlug: req.orgSession.orgSlug,
            isAdmin: req.orgSession.isAdmin,
            playerId: req.orgSession.playerId,
            expiresAt: req.orgSession.exp * 1000
          }
        });
      } else {
        res.json({ valid: false, message: "No valid organization session" });
      }
    } catch (error) {
      console.error("Error verifying organization session:", error);
      res.status(500).json({ message: "Failed to verify organization session" });
    }
  });

  // Organization management routes (super admin only)
  app.get('/api/organizations', nonRedirectingAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const organizations = await storage.getAllOrganizations();
      res.json(organizations);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  app.get('/api/organizations/:id', enhancedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = req.params.id;
      
      // Check if user is super admin or admin of this organization
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      const isOrgAdmin = await storage.isUserOrganizationAdmin(userId, organizationId);
      
      if (!isSuperAdmin && !isOrgAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }

      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      res.json(organization);
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ message: "Failed to fetch organization" });
    }
  });

  app.post('/api/organizations', nonRedirectingAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const validatedData = insertOrganizationSchema.parse(req.body);
      // Set createdById from authenticated user
      const orgDataWithCreator = {
        ...validatedData,
        createdById: userId
      };
      const newOrg = await storage.createOrganization(orgDataWithCreator);
      
      res.status(201).json(newOrg);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating organization:", error);
      res.status(500).json({ message: "Failed to create organization" });
    }
  });

  app.put('/api/organizations/:id', enhancedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = req.params.id;
      
      // Check if user is super admin
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const validatedData = insertOrganizationSchema.partial().parse(req.body);
      const updatedOrg = await storage.updateOrganization(organizationId, validatedData);
      
      res.json(updatedOrg);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating organization:", error);
      res.status(500).json({ message: "Failed to update organization" });
    }
  });

  app.delete('/api/organizations/:id', enhancedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = req.params.id;
      
      // Check if user is super admin
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Prevent deleting parent organization
      if (organization.isParent) {
        return res.status(400).json({ message: "Cannot delete parent organization" });
      }

      await storage.deleteOrganization(organizationId);
      res.json({ message: "Organization deleted successfully" });
    } catch (error) {
      console.error("Error deleting organization:", error);
      res.status(500).json({ message: "Failed to delete organization" });
    }
  });

  // Organization admin management routes
  app.get('/api/organizations/:id/admins', enhancedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = req.params.id;
      
      // Check if user is super admin or admin of this organization
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      const isOrgAdmin = await storage.isUserOrganizationAdmin(userId, organizationId);
      
      if (!isSuperAdmin && !isOrgAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }

      const admins = await storage.getOrganizationAdmins(organizationId);
      res.json(admins);
    } catch (error) {
      console.error("Error fetching organization admins:", error);
      res.status(500).json({ message: "Failed to fetch organization admins" });
    }
  });

  app.post('/api/organizations/:id/admins', enhancedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const organizationId = req.params.id;
      
      // Check if user is super admin
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required" });
      }

      // Parse request body (without organizationId since schema omits it)
      const bodyData = insertOrganizationAdminSchema.parse(req.body);
      
      // Add organizationId from route parameter (secure, can't be spoofed)
      const validatedData = {
        ...bodyData,
        organizationId,
      };
      const newAdmin = await storage.addOrganizationAdmin(validatedData);
      
      res.status(201).json(newAdmin);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error adding organization admin:", error);
      res.status(500).json({ message: "Failed to add organization admin" });
    }
  });

  app.delete('/api/organizations/:id/admins/:userId', enhancedAuth, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const organizationId = req.params.id;
      const targetUserId = req.params.userId;
      
      // Check if user is super admin
      const isSuperAdmin = await storage.isUserSuperAdmin(currentUserId);
      
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required" });
      }

      await storage.removeOrganizationAdmin(organizationId, targetUserId);
      res.json({ message: "Organization admin removed successfully" });
    } catch (error) {
      console.error("Error removing organization admin:", error);
      res.status(500).json({ message: "Failed to remove organization admin" });
    }
  });

  // Course copying route (super admin only)
  app.post('/api/organizations/:id/copy-course', enhancedAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const targetOrganizationId = req.params.id;
      
      // Check if user is super admin
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const { courseId } = req.body;
      if (!courseId) {
        return res.status(400).json({ message: "Course ID is required" });
      }

      const copiedCourse = await storage.copyCourseToOrganization(courseId, targetOrganizationId);
      res.status(201).json(copiedCourse);
    } catch (error) {
      console.error("Error copying course:", error);
      res.status(500).json({ message: "Failed to copy course" });
    }
  });

  // User lookup route (super admin only) 
  app.get('/api/users/lookup', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required" });
      }

      const { email } = req.query;
      if (!email) {
        return res.status(400).json({ message: "Email query parameter is required" });
      }

      let user = await storage.getUserByEmail(email as string);
      
      // If user doesn't exist, create a new user
      if (!user) {
        user = await storage.createUserFromEmail(email as string);
      }

      // Return only safe user data
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    } catch (error) {
      console.error("Error looking up user:", error);
      res.status(500).json({ message: "Failed to lookup user" });
    }
  });

  // Player routes
  app.get('/api/players', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Only super admins can access global players list
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required for global player data" });
      }

      const players = await storage.getAllPlayers();
      res.json(createPreviewResponse(players));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch players" });
    }
  });

  // Organization-scoped players endpoint
  app.get('/api/organizations/:organizationId/players', enhancedAuth, async (req: any, res) => {
    try {
      const { organizationId } = req.params;
      const userId = req.user.claims.sub;
      
      // Check if user has access to this organization
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      
      // Super admins can access any organization for oversight
      if (!isSuperAdmin) {
        // For non-super admins, check org admin or player membership
        const isOrgAdmin = await storage.isUserOrganizationAdmin(userId, organizationId);
        const playerInThisOrg = await storage.getPlayerByUserIdAndOrganization(userId, organizationId);
        const isPlayerInOrg = !!playerInThisOrg;
        
        if (!isOrgAdmin && !isPlayerInOrg) {
          return res.status(403).json({ message: "Access denied to this organization" });
        }
      }

      const players = await storage.getAllPlayers(organizationId);
      
      // Return player data - all authenticated org members can see players
      // (needed for leaderboards, handicaps, and golf functionality)
      res.json(createPreviewResponse(players));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch players" });
    }
  });

  app.get('/api/players/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const playerId = req.params.id;
      
      // Get the player to check their organization
      const player = await storage.getPlayer(playerId);
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }
      
      // Check if user has access to this player's organization
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      
      // Super admins can access any player for oversight
      if (!isSuperAdmin) {
        // For non-super admins, check org admin or player membership
        const isOrgAdmin = await storage.isUserOrganizationAdmin(userId, player.organizationId!);
        const playerInThisOrg = await storage.getPlayerByUserIdAndOrganization(userId, player.organizationId!);
        const isPlayerInOrg = !!playerInThisOrg;
        
        if (!isOrgAdmin && !isPlayerInOrg) {
          return res.status(403).json({ message: "Access denied to this player" });
        }
      }
      
      res.json(createPreviewResponse(player));
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
  app.get('/api/courses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Only super admins can access global courses list
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required for global course data" });
      }

      const courses = await storage.getAllCourses();
      res.json(courses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  // Organization-scoped courses endpoint
  app.get('/api/organizations/:organizationId/courses', enhancedAuth, async (req: any, res) => {
    try {
      const { organizationId } = req.params;
      const userId = req.user.claims.sub;
      
      // Check if user has access to this organization
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      
      // Super admins can access any organization for oversight
      if (!isSuperAdmin) {
        // For non-super admins, check org admin or player membership
        const isOrgAdmin = await storage.isUserOrganizationAdmin(userId, organizationId);
        const playerInThisOrg = await storage.getPlayerByUserIdAndOrganization(userId, organizationId);
        const isPlayerInOrg = !!playerInThisOrg;
        
        if (!isOrgAdmin && !isPlayerInOrg) {
          return res.status(403).json({ message: "Access denied to this organization" });
        }
      }

      const courses = await storage.getAllCourses(organizationId);
      res.json(courses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  app.get('/api/courses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const courseId = req.params.id;
      
      // Get the course to check its organization
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      // Check if user has access to this course's organization
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      
      // Super admins can access any course for oversight
      if (!isSuperAdmin) {
        // For non-super admins, check org admin or player membership
        const isOrgAdmin = await storage.isUserOrganizationAdmin(userId, course.organizationId!);
        const playerInThisOrg = await storage.getPlayerByUserIdAndOrganization(userId, course.organizationId!);
        const isPlayerInOrg = !!playerInThisOrg;
        
        if (!isOrgAdmin && !isPlayerInOrg) {
          return res.status(403).json({ message: "Access denied to this course" });
        }
      }
      
      res.json(course);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });

  app.get('/api/courses/:id/holes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const courseId = req.params.id;
      
      // Get the course to check its organization
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      // Check if user has access to this course's organization
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      
      if (!isSuperAdmin) {
        const isOrgAdmin = await storage.isUserOrganizationAdmin(userId, course.organizationId!);
        const playerInThisOrg = await storage.getPlayerByUserIdAndOrganization(userId, course.organizationId!);
        const isPlayerInOrg = !!playerInThisOrg;
        
        if (!isOrgAdmin && !isPlayerInOrg) {
          return res.status(403).json({ message: "Access denied to this course" });
        }
      }
      
      const holes = await storage.getHolesByCourse(courseId);
      res.json(holes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch holes" });
    }
  });

  app.post('/api/courses', isPreviewMode() ? (req: any, res: any, next: any) => next() : isAuthenticated, async (req: any, res) => {
    try {
      if (!isPreviewMode()) {
        const userEmail = req.user.claims.email;
        const player = await storage.getPlayerByEmail(userEmail || '');
        
        if (!player?.isAdmin) {
          return res.status(403).json({ message: "Admin access required" });
        }
      } else {
        // In preview mode, skip auth but still enforce admin-only operation
        // For now, allow course creation in preview mode for demo purposes
        console.log("🔧 Preview mode: Allowing course creation for demonstration");
      }

      const validatedData = insertCourseSchema.parse(req.body);
      const newCourse = await storage.createCourse(validatedData);
      res.status(201).json(newCourse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Course creation error:", error);
      res.status(500).json({ message: "Failed to create course" });
    }
  });

  // Update course (admin only)
  app.put('/api/courses/:id', isPreviewMode() ? (req: any, res: any, next: any) => next() : isAuthenticated, async (req: any, res) => {
    try {
      if (!isPreviewMode()) {
        const userEmail = req.user.claims.email;
        const player = await storage.getPlayerByEmail(userEmail || '');
        
        if (!player?.isAdmin) {
          return res.status(403).json({ message: "Admin access required" });
        }
      } else {
        console.log("🔧 Preview mode: Allowing course update for demonstration");
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
  app.put('/api/holes/:id', isPreviewMode() ? (req: any, res: any, next: any) => next() : isAuthenticated, async (req: any, res) => {
    try {
      if (!isPreviewMode()) {
        const userEmail = req.user.claims.email;
        const player = await storage.getPlayerByEmail(userEmail || '');
        
        if (!player?.isAdmin) {
          return res.status(403).json({ message: "Admin access required" });
        }
      } else {
        console.log("🔧 Preview mode: Allowing hole update for demonstration");
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

  // Admin endpoint to ensure a course has 18 holes
  app.post('/api/admin/courses/:courseId/ensure-holes', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const userEmail = req.user.claims.email;
      const authenticatedPlayer = await storage.getPlayerByEmail(userEmail || '');
      
      if (!authenticatedPlayer?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const courseId = req.params.courseId;
      
      // Verify course exists
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      // Check current holes count
      const existingHoles = await storage.getHolesByCourse(courseId);
      
      if (existingHoles.length === 18) {
        return res.json({ 
          message: "Course already has 18 holes", 
          count: 18,
          holes: existingHoles.sort((a, b) => a.number - b.number)
        });
      }

      // Remove any existing holes and create 18 default holes
      await storage.deleteHolesByCourse(courseId);
      
      // Create 18 holes with default par layout
      const defaultHoles: InsertHole[] = Array.from({ length: 18 }, (_, i) => {
        // Default par layout: mix of par 3s, 4s, and 5s
        const defaultPars = [4, 3, 4, 5, 4, 3, 4, 4, 4, 4, 3, 4, 5, 4, 4, 3, 4, 5];
        return {
          courseId: courseId,
          number: i + 1,
          par: defaultPars[i],
          distance: 400, // Default distance
        };
      });
      
      const newHoles = await storage.createHoles(defaultHoles);
      
      res.json({ 
        message: "Successfully ensured 18 holes for course",
        count: newHoles.length,
        holes: newHoles.sort((a, b) => a.number - b.number)
      });
    } catch (error) {
      console.error('Error ensuring course holes:', error);
      res.status(500).json({ message: "Failed to ensure course holes" });
    }
  });

  // Round routes
  app.get('/api/rounds', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Only super admins can access global rounds data
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required for global rounds data" });
      }

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

  // Organization-scoped rounds endpoint
  app.get('/api/organizations/:organizationId/rounds', enhancedAuth, async (req: any, res) => {
    try {
      const { organizationId } = req.params;
      const userId = req.user.claims.sub;
      
      // Check if user has access to this organization
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      
      // Super admins can access any organization for oversight
      if (!isSuperAdmin) {
        // For non-super admins, check org admin or player membership
        const isOrgAdmin = await storage.isUserOrganizationAdmin(userId, organizationId);
        const playerInThisOrg = await storage.getPlayerByUserIdAndOrganization(userId, organizationId);
        const isPlayerInOrg = !!playerInThisOrg;
        
        if (!isOrgAdmin && !isPlayerInOrg) {
          return res.status(403).json({ message: "Access denied to this organization" });
        }
      }

      const { month, playerId } = req.query;
      let rounds;
      
      if (playerId) {
        rounds = await storage.getRoundsByPlayer(
          playerId as string, 
          month as string | undefined,
          organizationId
        );
      } else {
        rounds = await storage.getAllRounds(month as string | undefined, organizationId);
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

  // Admin-only endpoint for creating test rounds with any player ID
  app.post('/api/admin/rounds', isAuthenticated, async (req: any, res) => {
    try {
      // Check if user is admin
      const userEmail = req.user.claims.email;
      const authenticatedPlayer = await storage.getPlayerByEmail(userEmail || '');
      
      if (!authenticatedPlayer?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validatedData = createRoundSchema.parse(req.body);
      
      // For admin test rounds, use the provided playerId instead of authenticated user
      const targetPlayer = await storage.getPlayer(validatedData.playerId);
      if (!targetPlayer) {
        return res.status(404).json({ message: "Target player not found" });
      }

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

      // Create complete round data using specified player (admin privilege)
      const roundData = {
        ...validatedData,
        playerId: validatedData.playerId, // Use the specified playerId for admin test rounds
        cappedScores: scoreCalculation.cappedScores,
        grossCapped: scoreCalculation.grossCapped,
        net: scoreCalculation.net,
        overPar: scoreCalculation.overPar.toString(),
        source: 'admin' as const,
      };

      const newRound = await storage.createRound(roundData);
      res.status(201).json(newRound);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create admin test round" });
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

      // Validate rawScores and courseHandicap
      const { rawScores, courseHandicap } = req.body;
      if (!Array.isArray(rawScores) || rawScores.length !== 18) {
        return res.status(400).json({ message: "Must provide exactly 18 scores" });
      }

      if (!rawScores.every(score => Number.isInteger(score) && score >= 1 && score <= 10)) {
        return res.status(400).json({ message: "All scores must be integers between 1 and 10" });
      }

      // Validate courseHandicap if provided
      const updatedHandicap = courseHandicap !== undefined ? courseHandicap : existingRound.courseHandicap;
      if (typeof updatedHandicap !== 'number' || updatedHandicap < 0 || updatedHandicap > 54) {
        return res.status(400).json({ message: "Course handicap must be a number between 0 and 54" });
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
      
      // Recalculate round scores with new raw scores and handicap
      const scoreCalculation = calculateRoundScores(
        rawScores,
        holePars,
        updatedHandicap,
        course.parTotal
      );

      // Update round with recalculated values
      const updatedRound = await storage.updateRound(roundId, {
        rawScores: rawScores,
        courseHandicap: updatedHandicap,
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
  app.get('/api/leaderboard', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Only super admins can access global leaderboard data
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required for global leaderboard data" });
      }

      const leaderboard = await storage.getLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Organization-scoped leaderboard endpoint
  app.get('/api/organizations/:organizationId/leaderboard', enhancedAuth, async (req: any, res) => {
    try {
      const { organizationId } = req.params;
      const userId = req.user.claims.sub;
      
      // Check if user has access to this organization
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      
      // Super admins can access any organization for oversight
      if (!isSuperAdmin) {
        // For non-super admins, check org admin or player membership
        const isOrgAdmin = await storage.isUserOrganizationAdmin(userId, organizationId);
        const playerInThisOrg = await storage.getPlayerByUserIdAndOrganization(userId, organizationId);
        const isPlayerInOrg = !!playerInThisOrg;
        
        if (!isOrgAdmin && !isPlayerInOrg) {
          return res.status(403).json({ message: "Access denied to this organization" });
        }
      }

      const leaderboard = await storage.getLeaderboard(organizationId);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Monthly leaderboard endpoints
  app.get('/api/leaderboard/monthly/:month', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Only super admins can access global monthly leaderboard data
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required for global leaderboard data" });
      }

      const { month } = req.params;
      const leaderboard = await storage.getMonthlyLeaderboard(month);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch monthly leaderboard" });
    }
  });

  app.get('/api/leaderboard/cumulative', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Only super admins can access global cumulative leaderboard data
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required for global leaderboard data" });
      }

      const leaderboard = await storage.getCumulativeLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cumulative leaderboard" });
    }
  });

  // Leaderboard history
  app.get('/api/leaderboard/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Only super admins can access global leaderboard history
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required for global leaderboard data" });
      }

      const history = await storage.getLeaderboardHistory();
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leaderboard history" });
    }
  });

  app.get('/api/leaderboard/history/:month', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Only super admins can access global leaderboard history
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required for global leaderboard data" });
      }

      const { month } = req.params;
      const snapshot = await storage.getMonthlyLeaderboardSnapshot(month);
      res.json(snapshot);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch monthly leaderboard snapshot" });
    }
  });

  // Monthly winners
  app.get('/api/monthly-winners', async (req, res) => {
    try {
      const winners = await storage.getMonthlyWinners();
      res.json(winners);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch monthly winners" });
    }
  });

  app.get('/api/monthly-winners/:month', async (req, res) => {
    try {
      const { month } = req.params;
      const winner = await storage.getMonthlyWinner(month);
      res.json(winner || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch monthly winner" });
    }
  });

  // Admin endpoint to announce monthly winner
  app.post('/api/admin/announce-winner', isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user?.claims?.email;
      const player = await storage.getPlayerByEmail(userEmail || '');
      
      if (!player?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { month, winnerId, winnerName, winnerScore, runnerUpId, runnerUpName, runnerUpScore } = req.body;
      
      if (!month || !winnerId || !winnerName || winnerScore === undefined) {
        return res.status(400).json({ message: "Missing required winner data" });
      }

      // Check if winner already announced for this month
      const existingWinner = await storage.getMonthlyWinner(month);
      if (existingWinner) {
        return res.status(400).json({ message: "Winner already announced for this month" });
      }

      // Save leaderboard snapshot first
      await storage.saveMonthlyLeaderboardSnapshot(month);

      // Announce winner
      const winnerData = {
        month,
        winnerId,
        winnerName,
        winnerScore: winnerScore.toString(),
        runnerUpId: runnerUpId || null,
        runnerUpName: runnerUpName || null,
        runnerUpScore: runnerUpScore ? runnerUpScore.toString() : null,
        announcedBy: player.id,
      };

      const result = await storage.announceMonthlyWinner(winnerData);
      res.json(result);
    } catch (error) {
      console.error('Error announcing monthly winner:', error);
      res.status(500).json({ message: "Failed to announce monthly winner" });
    }
  });

  // Player statistics endpoints
  app.get('/api/players/:playerId/stats/monthly/:month', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { playerId, month } = req.params;
      
      // Get the player to check their organization
      const player = await storage.getPlayer(playerId);
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }
      
      // Check if user has access to this player's organization
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      
      if (!isSuperAdmin) {
        const isOrgAdmin = await storage.isUserOrganizationAdmin(userId, player.organizationId!);
        const playerInThisOrg = await storage.getPlayerByUserIdAndOrganization(userId, player.organizationId!);
        const isPlayerInOrg = !!playerInThisOrg;
        
        if (!isOrgAdmin && !isPlayerInOrg) {
          return res.status(403).json({ message: "Access denied to this player's stats" });
        }
      }
      
      const stats = await storage.getPlayerMonthlyStats(playerId, month);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch player monthly stats" });
    }
  });

  app.get('/api/players/:playerId/stats/cumulative', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { playerId } = req.params;
      
      // Get the player to check their organization
      const player = await storage.getPlayer(playerId);
      if (!player) {
        return res.status(404).json({ message: "Player not found" });
      }
      
      // Check if user has access to this player's organization
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      
      if (!isSuperAdmin) {
        const isOrgAdmin = await storage.isUserOrganizationAdmin(userId, player.organizationId!);
        const playerInThisOrg = await storage.getPlayerByUserIdAndOrganization(userId, player.organizationId!);
        const isPlayerInOrg = !!playerInThisOrg;
        
        if (!isOrgAdmin && !isPlayerInOrg) {
          return res.status(403).json({ message: "Access denied to this player's stats" });
        }
      }
      
      const stats = await storage.getPlayerCumulativeStats(playerId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch player cumulative stats" });
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
  
  // GET endpoint for automated cron job (blocked in preview mode)
  app.get('/api/handicaps/apply', async (req, res) => {
    // Block in preview mode
    if (isPreviewMode()) {
      return res.status(403).json({ message: "Preview mode: handicap recalculation disabled" });
    }
    
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
  app.get('/api/handicaps/snapshots', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Only super admins can access global handicap snapshots
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Super admin access required for global handicap data" });
      }

      const snapshots = await storage.getAllHandicapSnapshots();
      res.json(createPreviewResponse(snapshots));
    } catch (error) {
      console.error('Error fetching handicap snapshots:', error);
      res.status(500).json({ message: "Failed to fetch handicap snapshots" });
    }
  });

  // Organization-scoped handicap snapshots endpoint
  app.get('/api/organizations/:organizationId/handicaps/snapshots', enhancedAuth, async (req: any, res) => {
    try {
      const { organizationId } = req.params;
      const userId = req.user.claims.sub;
      
      // Check if user has access to this organization
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      
      // Super admins can access any organization for oversight
      if (!isSuperAdmin) {
        // For non-super admins, check org admin or player membership
        const isOrgAdmin = await storage.isUserOrganizationAdmin(userId, organizationId);
        const playerInThisOrg = await storage.getPlayerByUserIdAndOrganization(userId, organizationId);
        const isPlayerInOrg = !!playerInThisOrg;
        
        if (!isOrgAdmin && !isPlayerInOrg) {
          return res.status(403).json({ message: "Access denied to this organization" });
        }
      }

      const snapshots = await storage.getAllHandicapSnapshots(organizationId);
      res.json(createPreviewResponse(snapshots));
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
