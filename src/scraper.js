const cheerio = require('cheerio');
var request = require('request-promise');
const { performance } = require('perf_hooks');
const fs = require('fs');

const BASE_URL = 'https://web.uvic.ca/calendar2020-01/CDs/';
const SECTIONS_URL = 'https://www.uvic.ca/BAN1P/bwckctlg.p_disp_listcrse';

/**
 * Gets the department/subject codes
 *
 * @returns {string[]} an array of department codes
 */
const getDepartments = async () => {
  try {
    const response = await request(BASE_URL);
    const $ = cheerio.load(response);

    const departments = [];
    $('a').each((index, element) => {
      const department = $(element).attr('href');
      if (/^[A-Z]+/g.test(department)) {
        departments.push(department.slice(0, -1));
      }
    });
    return departments;
  } catch (error) {
    console.log(error);
    throw new Error('Failed to get department data');
  }
};

/**
 * Gets the course number codes
 * 
 * @param {string} department a department code - e.g. 'CSC'
 * 
 * @returns {string[]} an array of course codes
 */
const getCourses = async department => {
  try {
    const response = await request(`${BASE_URL}${department}`);
    const $ = cheerio.load(response);
    
    let courses = [];
    $('a').each((index, element) => {
      const course = $(element).attr('href');
      if (/^[0-7]+/g.test(course)) {
        courses.push(course.slice(0, course.indexOf('.')));
      }
    });
    return courses;
  } catch (error) {
    throw new Error('Failed to get course data');
  }
}

/**
 * Gets the courses that are currently being offered
 * 
 * @param {string} subject a subject/department code - e.g. 'CSC' 
 * @param {string} code a subject code - e.g. '421'
 * 
 * @typedef {Object} Course
 * @property {numer} code - course code
 * @property {number[]} crns - section crns
 * @property {string} subject - the course department/subject
 * @property {string} title - the course title
 * @property {number} term - the term the course is offered 
 * 
 * @returns {Course} - an array of all courses currently offered
 */
const getOffered = async (subject, code) => {
  try {
    const response = await request(`${BASE_URL}${subject}/${code}.html`);
    const $ = cheerio.load(response);

    const title = $('h2').text();

    const schedules = []
    $('#schedules').find('a').each((index, element) => {
      const temp = $(element).attr('href');
      schedules.push(temp.slice(temp.indexOf('?'), temp.length));
    });

    const courses = []
    for (const schedule of schedules) {
      const crns = await getSections(schedule);
      if (crns.length) {
        courses.push({code, crns, subject, title, term: +schedule.match(/term_in=(\d+)/)[1]});
      }
    }
    return courses;
  } catch (error) {
    throw new Error('Failed to get avaliable sections');
  }
}

/**
 * Gets the crns for the given course
 * 
 * @param {string} params - query params used with the sections url 
 * 
 * @returns {number[]} - an array of crns
 */
const getSections = async params => {
  try {
    const response = await request(`${SECTIONS_URL}${params}`);
    const $ = cheerio.load(response);
    
    const crns = []
    $('a').each((index, element) => {
      const temp = $(element).attr('href');
      if(/crn_in/g.test(temp)) {
        crns.push(+temp.match(/crn_in=(\d+)/)[1]);
      }
    });
    return crns;
  } catch(error) {
    throw new Error('Failed to get sections');
  }
};

const main = async () => {

  // Get all courses currently being offered
  const failed = [];
  const courses = {};
  const departments = await getDepartments();
  process.stdout.write('Getting courses for ')
  for (const department of departments) {
    process.stdout.cursorTo(20);
    process.stdout.write(`${department}  `);
    try {
      const temp = await getCourses(department);
      courses[department] = temp;
    } catch (error) {
      failed.push(department);
    }
  }
  process.stdout.clearLine();
  process.stdout.cursorTo(0);

  // Get data about each course - e.g. crns, terms offered
  const start = performance.now();

  const test = [];
  process.stdout.write('Getting data for ');
  for (const subject of Object.keys(courses)) {
    for (const code of courses[subject]) {
      process.stdout.cursorTo(17);
      process.stdout.write(`${subject} ${code}  `)
      const avaliable = await getOffered(subject, code);
      test.push(avaliable);
    }
  }
  process.stdout.clearLine();
  process.stdout.cursorTo(0);

  const finish = performance.now();
  console.log(`Getting course data took ${(finish-start)/60000} minutes`);

  fs.writeFileSync('courses.json', JSON.stringify(test.flat()));
}

main();
