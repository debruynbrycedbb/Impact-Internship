/* Find Your Impact: content and settings.
   Everything a non-coder might want to change lives in this file. */

window.IMPACT = {
  /* Where sign-ups are sent: the address of the Cloudflare Worker (see worker/SETUP.md),
     e.g. 'https://impact-fair.yourname.workers.dev'. Leave it empty to keep sign-ups on this
     device only (download them from the staff panel: add #admin to the address).
     No keys or email addresses go here: they live in the Worker's settings. */
  worker: 'https://impact-fair.debruynbryce-dbb.workers.dev',

  /* Seconds of no touching before the kiosk asks "Still exploring?" and then resets. */
  kiosk: { idleSeconds: 45, idleCountdown: 10, thanksSeconds: 20 },

  /* The two destinations. From the role sheets: Rwanda builds on established projects,
     South Africa starts new initiatives. */
  places: {
    rw: { city: 'Kigali', country: 'Rwanda', coords: '1.94° S, 30.06° E',
          way: 'Here you build on established projects that already make a difference.' },
    sa: { city: 'Cape Town', country: 'South Africa', coords: '33.92° S, 18.42° E',
          way: 'Here you help start new initiatives, close to a young startup scene.' }
  },

  /* The eight internship roles, from the Impact Internship role sheets.
     places: where the role runs. Every sheet lists both destinations, except
     Environmental Studies, which talks about Rwanda only: confirm with the team.
     tasks: the six responsibilities from each sheet. */
  programs: {
    biz:    { name: 'Business Studies', sub: 'Marketing & Finance', tag: 'Markets & money', img: 'team-sign', places: ['rw', 'sa'],
              blurb: 'Analyse markets, build financial plans and develop ideas that help community projects grow.',
              tasks: ['Market analysis', 'Financial planning', 'Brand development', 'Data-driven insights', 'Community engagement', 'Strategic partnerships'] },
    comm:   { name: 'Communication', tag: 'Stories & channels', img: 'kigali-street', places: ['rw', 'sa'],
              blurb: 'Create content, plan communication and tell the stories of the Youth Development Sponsorship Program (YDSP) to local and global audiences.',
              tasks: ['Social media & content creation', 'Marketing communication plan', 'Documentary & video production', 'Community outreach', 'Crisis communication planning', 'Audience research'] },
    env:    { name: 'Environmental Studies', tag: 'Nature & research', img: 'lake-hills', places: ['rw'],
              blurb: 'Support conservation projects, gather ecological data and help local communities protect the nature around them.',
              tasks: ['Conservation projects', 'Environmental research', 'Community education', 'Sustainable practices', 'Environmental impact assessments', 'Awareness campaigns'] },
    tour:   { name: 'Equitable Tourism', tag: 'Fair travel', img: 'safari-selfie', places: ['rw', 'sa'],
              blurb: 'Design travel experiences that are good for visitors and local communities alike, with fair benefits and respect for culture and nature.',
              tasks: ['Sustainable tourism initiatives', 'Impact assessment', 'Community collaboration', 'Event & experience coordination', 'Sustainability reporting', 'Marketing & promotion'] },
    global: { name: 'Global Studies', tag: 'Global & local', img: 'palace-group', places: ['rw', 'sa'],
              blurb: 'Explore how global trends meet local realities, through cultural exchange, research and work with local NGOs and partners.',
              tasks: ['Cultural exchange programs', 'Research & reporting', 'Communication', 'Community engagement', 'Partnership support', 'Awareness campaigns'] },
    nutri:  { name: 'Nutrition & Dietetics', tag: 'Community health', img: 'kitchen-training', places: ['rw', 'sa'],
              blurb: 'Design nutrition programs, run health workshops and tackle issues like malnutrition and food safety with local families.',
              tasks: ['Nutrition modules', 'Community health workshops', 'Nutritional impact analysis', 'Healthy menu planning', 'Food security research', 'Culinary training support'] },
    safety: { name: 'Safety & Security', tag: 'Youth & prevention', img: 'workshop-room', places: ['rw', 'sa'],
              blurb: 'Research local safety challenges and run workshops on issues like youth crime and substance abuse, for a safer, more resilient community.',
              tasks: ['Youth crime & prevention research', 'Substance abuse awareness workshops', 'Employment & livelihood analysis', 'Health & safety guidelines', 'Community outreach', 'Risk assessment data'] },
    social: { name: 'Social Work', tag: 'Mentoring youth', img: 'classroom-tablet', places: ['rw', 'sa'],
              blurb: 'Be at the heart of the YDSP: build relationships with students, follow their progress and help shape their personal development plans.',
              tasks: ['Individual support plans', 'Progress monitoring', 'Development assessments', 'Life skills workshops', 'Emotional support', 'Work with teachers and parents'] }
  },

  /* Intro photo stack. Captions are shown on the photo: check each one is right. */
  stack: [
    { img: 'gorillas', caption: 'Rwanda' },
    { img: 'cape-town', caption: 'Cape Town' },
    { img: 'crater-mist', caption: 'Rwanda' },
    { img: 'safari-selfie', caption: '' },
    { img: 'lioness', caption: 'South Africa' },
    { img: 'palace-group', caption: '' }
  ],

  questions: [
    {
      id: 'study', type: 'chips',
      kicker: "Let's start with you",
      title: 'What do you study?',
      hint: 'Every study background is welcome.',
      options: [
        { v: 'business',  label: 'Business, marketing & finance', score: { biz: 5, tour: 1 }, phrase: 'you study business' },
        { v: 'comm',      label: 'Communication & media', score: { comm: 5, biz: 1 }, phrase: 'you study communication' },
        { v: 'env',       label: 'Environment & ecology', score: { env: 5, tour: 1 }, phrase: 'you study the environment' },
        { v: 'tourism',   label: 'Tourism & hospitality', score: { tour: 5, biz: 1, env: 1 }, phrase: 'you study tourism' },
        { v: 'global',    label: 'International relations & development', score: { global: 5, social: 1 }, phrase: 'you study how the world connects' },
        { v: 'nutrition', label: 'Nutrition & health', score: { nutri: 5, social: 1 }, phrase: 'you study nutrition and health' },
        { v: 'safety',    label: 'Safety, security & criminology', score: { safety: 5, social: 1 }, phrase: 'you study safety and security' },
        { v: 'social',    label: 'Social work & psychology', score: { social: 5, safety: 1 }, phrase: 'you study people and how they grow' },
        { v: 'education', label: 'Education & teaching', score: { social: 2, nutri: 1, safety: 1, global: 1 }, phrase: 'you study education' },
        { v: 'other',     label: 'Something else', score: { biz: 1, comm: 1, env: 1, tour: 1, global: 1, nutri: 1, safety: 1, social: 1 }, phrase: 'you bring a background of your own' }
      ]
    },
    {
      id: 'day', type: 'slider',
      kicker: 'Picture a good day',
      title: 'Your ideal day is spent with…',
      hint: 'Slide to where you feel most at home.',
      left:  { label: 'People', img: 'classroom-tablet' },
      right: { label: 'Nature', img: 'lioness' },
      /* how much each end of the slider adds to each role */
      people: { social: 2, safety: 2, nutri: 2, comm: 1.5, biz: 1, global: 1.5 },
      nature: { env: 3, tour: 2.5, global: 0.5 }
    },
    {
      id: 'place', type: 'split',
      kicker: 'Two places, two ways in',
      title: 'Where would you rather make your mark?',
      hint: 'Rwanda builds on established projects. South Africa starts new ones.',
      options: [
        { v: 'rw', label: 'Grow something that already works', sub: 'Kigali, Rwanda', img: 'crater-mist',
          score: { social: 1, nutri: 1, env: 1 }, phrase: "you'd like to grow something that already works" },
        { v: 'sa', label: 'Help start something new', sub: 'Cape Town, South Africa', img: 'cape-town',
          score: { biz: 1, tour: 1, comm: 1 }, phrase: "you'd like to help start something new" }
      ]
    },
    {
      id: 'rank', type: 'rank',
      kicker: 'What matters',
      title: 'What should you come home with?',
      hint: 'Drag, or use the arrows, to put what matters most at the top.',
      options: [
        { v: 'skills',  label: 'Real work experience', phrase: 'you want to come home with real experience' },
        { v: 'credits', label: 'Study credits', phrase: 'you want it to count toward your studies' },
        { v: 'culture', label: 'A new culture, from the inside', phrase: 'you want to live a new culture from the inside' },
        { v: 'story',   label: 'A story worth telling', phrase: 'you want a story worth telling' }
      ]
    },
    {
      id: 'learn', type: 'tiles',
      kicker: 'How you work',
      title: 'You do your best work by…',
      hint: 'Pick the one that sounds most like you.',
      options: [
        { v: 'create',  label: 'Creating',  sub: 'Content, campaigns and stories people share', score: { comm: 3, tour: 2, biz: 1 }, phrase: 'you do your best work by creating' },
        { v: 'analyse', label: 'Analysing', sub: 'Data, research and numbers that point the way', score: { biz: 3, env: 1, nutri: 1, safety: 1 }, phrase: 'you do your best work by analysing' },
        { v: 'teach',   label: 'Guiding',   sub: 'Workshops, mentoring, helping people grow', score: { social: 3, safety: 2, nutri: 2 }, phrase: 'you do your best work by guiding people' },
        { v: 'explore', label: 'Exploring', sub: 'Fieldwork, new places and other points of view', score: { global: 3, env: 2, tour: 1 }, phrase: 'you do your best work out exploring' }
      ]
    },
    {
      id: 'months', type: 'timeline',
      kicker: 'Time',
      title: 'How long could you go?',
      hint: 'Programs are flexible. We recommend 5 months.',
      min: 1, max: 12, recommended: 5
    },
    {
      id: 'start', type: 'months',
      kicker: 'Last one',
      title: 'When could you leave?',
      hint: 'A rough idea is fine.'
    }
  ]
};
