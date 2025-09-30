-- ============================================================================
-- PRODUCTION DATABASE MIGRATION SCRIPT
-- Add 5 Global Golf Courses with Complete 18-Hole Data
-- ============================================================================
-- This script will:
-- 1. Make all existing courses global (organization_id = NULL)
-- 2. Insert 5 new courses with exact data from development
-- 3. Insert all 90 holes (18 holes per course) with complete par and distance data
-- ============================================================================

BEGIN;

-- Step 1: Make all existing courses global
UPDATE courses SET organization_id = NULL;

-- Step 2: Insert BPGC Course
WITH new_course AS (
  INSERT INTO courses (organization_id, name, tees, par_total, rating, slope)
  VALUES (NULL, 'BPGC', 'Blue', 70, NULL, 120)
  RETURNING id
)
INSERT INTO holes (course_id, number, par, distance)
SELECT id, hole_number, par, distance FROM new_course,
(VALUES 
  (1, 5, 476), (2, 3, 160), (3, 4, 289), (4, 5, 476), (5, 4, 358),
  (6, 3, 186), (7, 4, 347), (8, 3, 189), (9, 4, 443), (10, 3, 140),
  (11, 4, 378), (12, 4, 312), (13, 3, 195), (14, 4, 443), (15, 4, 394),
  (16, 5, 476), (17, 3, 207), (18, 5, 398)
) AS holes(hole_number, par, distance);

-- Step 3: Insert Kharghar Valley Golf Course
WITH new_course AS (
  INSERT INTO courses (organization_id, name, tees, par_total, rating, slope)
  VALUES (NULL, 'Kharghar Valley Golf Course', 'Blue', 72, NULL, 123)
  RETURNING id
)
INSERT INTO holes (course_id, number, par, distance)
SELECT id, hole_number, par, distance FROM new_course,
(VALUES 
  (1, 5, 540), (2, 4, 346), (3, 3, 200), (4, 4, 398), (5, 4, 427),
  (6, 4, 477), (7, 4, 440), (8, 5, 606), (9, 3, 145), (10, 4, 427),
  (11, 3, 143), (12, 4, 295), (13, 4, 333), (14, 5, 496), (15, 4, 320),
  (16, 5, 500), (17, 3, 196), (18, 4, 423)
) AS holes(hole_number, par, distance);

-- Step 4: Insert Test Course Auto-Holes
WITH new_course AS (
  INSERT INTO courses (organization_id, name, tees, par_total, rating, slope)
  VALUES (NULL, 'Test Course Auto-Holes', 'Blue', 71, 72.0, 113)
  RETURNING id
)
INSERT INTO holes (course_id, number, par, distance)
SELECT id, hole_number, par, distance FROM new_course,
(VALUES 
  (1, 4, 400), (2, 3, 400), (3, 4, 400), (4, 5, 400), (5, 4, 400),
  (6, 3, 400), (7, 4, 400), (8, 4, 400), (9, 4, 400), (10, 4, 400),
  (11, 3, 400), (12, 4, 400), (13, 5, 400), (14, 4, 400), (15, 4, 400),
  (16, 3, 400), (17, 4, 400), (18, 5, 400)
) AS holes(hole_number, par, distance);

-- Step 5: Insert US Club
WITH new_course AS (
  INSERT INTO courses (organization_id, name, tees, par_total, rating, slope)
  VALUES (NULL, 'US Club', 'Blue', 70, NULL, 110)
  RETURNING id
)
INSERT INTO holes (course_id, number, par, distance)
SELECT id, hole_number, par, distance FROM new_course,
(VALUES 
  (1, 5, 450), (2, 3, 230), (3, 3, 160), (4, 4, 426), (5, 4, 384),
  (6, 4, 373), (7, 4, 340), (8, 3, 180), (9, 4, 320), (10, 3, 170),
  (11, 3, 175), (12, 4, 365), (13, 4, 250), (14, 4, 278), (15, 4, 389),
  (16, 5, 464), (17, 4, 307), (18, 5, 525)
) AS holes(hole_number, par, distance);

-- Step 6: Insert Willingdon Sports Club
WITH new_course AS (
  INSERT INTO courses (organization_id, name, tees, par_total, rating, slope)
  VALUES (NULL, 'Willingdon Sports Club', 'Blue', 65, NULL, 110)
  RETURNING id
)
INSERT INTO holes (course_id, number, par, distance)
SELECT id, hole_number, par, distance FROM new_course,
(VALUES 
  (1, 4, 364), (2, 3, 176), (3, 4, 284), (4, 4, 261), (5, 4, 235),
  (6, 3, 149), (7, 5, 434), (8, 3, 197), (9, 4, 142), (10, 3, 190),
  (11, 4, 252), (12, 3, 176), (13, 3, 206), (14, 3, 183), (15, 4, 228),
  (16, 3, 180), (17, 5, 487), (18, 3, 123)
) AS holes(hole_number, par, distance);

-- Step 7: Verify the data
SELECT 
  c.name as course_name, 
  c.par_total, 
  c.slope,
  c.rating,
  COUNT(h.id) as hole_count,
  SUM(h.par) as calculated_par
FROM courses c
LEFT JOIN holes h ON c.id = h.course_id
WHERE c.organization_id IS NULL
GROUP BY c.id, c.name, c.par_total, c.slope, c.rating
ORDER BY c.name;

COMMIT;

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- course_name                    | par_total | slope | rating | hole_count | calculated_par
-- -------------------------------|-----------|-------|--------|------------|--------------
-- BPGC                          | 70        | 120   | NULL   | 18         | 70
-- Kharghar Valley Golf Course   | 72        | 123   | NULL   | 18         | 72
-- Test Course Auto-Holes        | 71        | 113   | 72.0   | 18         | 71
-- US Club                       | 70        | 110   | NULL   | 18         | 70
-- Willingdon Sports Club        | 65        | 110   | NULL   | 18         | 65
-- ============================================================================
