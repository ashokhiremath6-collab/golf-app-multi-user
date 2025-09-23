// Using built-in fetch in Node.js 20+

const COURSE_DATA = {
  name: "Kharghar Valley Golf Course",
  tees: "Blue",
  parTotal: 72,
  rating: null, // No course rating provided
  slope: 123
};

const HOLES_DATA = [
  { hole: 1, par: 5, distance: 540 },
  { hole: 2, par: 4, distance: 346 },
  { hole: 3, par: 3, distance: 200 },
  { hole: 4, par: 4, distance: 398 },
  { hole: 5, par: 4, distance: 427 },
  { hole: 6, par: 4, distance: 477 },
  { hole: 7, par: 4, distance: 440 },
  { hole: 8, par: 5, distance: 606 },
  { hole: 9, par: 3, distance: 145 },
  { hole: 10, par: 4, distance: 427 },
  { hole: 11, par: 3, distance: 143 },
  { hole: 12, par: 4, distance: 295 },
  { hole: 13, par: 4, distance: 333 },
  { hole: 14, par: 5, distance: 496 },
  { hole: 15, par: 4, distance: 320 },
  { hole: 16, par: 5, distance: 500 },
  { hole: 17, par: 3, distance: 196 },
  { hole: 18, par: 4, distance: 423 }
];

async function addKhargarCourse() {
  const baseUrl = 'http://localhost:5000';
  
  console.log('🏌️ Creating Kharghar Valley Golf Course...');
  
  try {
    // Step 1: Create the course
    console.log('📝 Creating course with basic information...');
    const courseResponse = await fetch(`${baseUrl}/api/courses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In production, you'd need proper authentication headers
      },
      body: JSON.stringify(COURSE_DATA)
    });
    
    if (!courseResponse.ok) {
      const error = await courseResponse.text();
      throw new Error(`Failed to create course: ${courseResponse.status} ${error}`);
    }
    
    const newCourse = await courseResponse.json();
    console.log(`✅ Course created successfully: ${newCourse.name} (ID: ${newCourse.id})`);
    
    // Step 2: Get the holes for this course
    console.log('🕳️ Fetching holes for the course...');
    const holesResponse = await fetch(`${baseUrl}/api/courses/${newCourse.id}/holes`);
    
    if (!holesResponse.ok) {
      throw new Error(`Failed to fetch holes: ${holesResponse.status}`);
    }
    
    const holes = await holesResponse.json();
    console.log(`📋 Found ${holes.length} holes to update`);
    
    // Step 3: Update each hole with specific par and distance data
    console.log('🔧 Updating holes with specific data...');
    
    for (const holeData of HOLES_DATA) {
      // Find the corresponding hole in the database
      const hole = holes.find(h => h.number === holeData.hole);
      
      if (!hole) {
        console.log(`⚠️ Warning: Could not find hole ${holeData.hole} in database`);
        continue;
      }
      
      // Update the hole
      const updateResponse = await fetch(`${baseUrl}/api/holes/${hole.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // Note: In production, you'd need proper authentication headers
        },
        body: JSON.stringify({
          par: holeData.par,
          distance: holeData.distance
        })
      });
      
      if (!updateResponse.ok) {
        const error = await updateResponse.text();
        console.log(`❌ Failed to update hole ${holeData.hole}: ${error}`);
      } else {
        console.log(`✅ Updated hole ${holeData.hole}: Par ${holeData.par}, ${holeData.distance} yards`);
      }
    }
    
    console.log('\n🎉 Kharghar Valley Golf Course successfully added to the system!');
    console.log(`📊 Course Summary:`);
    console.log(`   Name: ${COURSE_DATA.name}`);
    console.log(`   Total Par: ${COURSE_DATA.parTotal}`);
    console.log(`   Slope Rating: ${COURSE_DATA.slope}`);
    console.log(`   Total Distance: ${HOLES_DATA.reduce((sum, h) => sum + h.distance, 0)} yards`);
    
  } catch (error) {
    console.error('❌ Error adding course:', error.message);
  }
}

// Run the script
addKhargarCourse();