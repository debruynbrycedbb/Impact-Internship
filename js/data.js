/* Find Your Impact: content and settings.
   Everything a non-coder might want to change lives in this file. */

window.IMPACT = {
  /* Where sign-ups are sent. Leave both empty to keep sign-ups on this device only
     (download them from the staff panel: add #admin to the address).
     Only ever put a PUBLISHABLE key here (sb_publishable_…), never a secret key. */
  supabase: { url: '', key: '', table: 'fair_leads' },

  /* Seconds of no touching before the kiosk asks "Still exploring?" and then resets. */
  kiosk: { idleSeconds: 45, idleCountdown: 10, thanksSeconds: 20 },

  places: {
    rw: { city: 'Kigali', country: 'Rwanda', coords: '1.94° S, 30.06° E' },
    sa: { city: 'Hoedspruit', country: 'South Africa', coords: '24.36° S, 30.95° E' }
  },

  /* The six internship areas listed on impact-internship.com. */
  programs: {
    edu:     { name: 'Education', place: 'rw', img: 'classroom-tablet',
               blurb: 'Work alongside teachers and students, helping with lessons, learning projects and everyday school life.' },
    comm:    { name: 'Community development', place: 'rw', img: 'kitchen-training',
               blurb: 'Join local initiatives that build skills and create opportunities, from training projects to small enterprises.' },
    media:   { name: 'Creative media', place: 'rw', img: 'kigali-street',
               blurb: 'Tell real stories through photography, video, design and social media for projects that make a difference.' },
    social:  { name: 'Social work', place: 'sa', img: 'group-bench',
               blurb: 'Support community programmes around Hoedspruit, working with people and families day to day.' },
    wild:    { name: 'Wildlife conservation', place: 'sa', img: 'rhinos',
               blurb: 'Get involved in conservation in the South African bushveld, close to the wildlife it protects.' },
    sustain: { name: 'Sustainable development', place: 'sa', img: 'leopard-tree',
               blurb: 'Work on projects that balance people, nature and the local economy, from the land to the community.' }
  },

  /* Shown on the result when someone studies business or tourism.
     Taken from the Impact Internship "Internship Program" flyer: check they are still open. */
  businessRoles: 'International communication, finance and business management, sales and marketing, and safety and security management',

  /* Intro photo stack. Captions are shown on the photo: check each one is right. */
  stack: [
    { img: 'gorillas', caption: 'Rwanda' },
    { img: 'lioness', caption: 'South Africa' },
    { img: 'crater-mist', caption: 'Rwanda' },
    { img: 'safari-selfie', caption: '' },
    { img: 'elephant', caption: 'South Africa' },
    { img: 'palace-group', caption: '' }
  ],

  questions: [
    {
      id: 'study', type: 'chips',
      kicker: "Let's start with you",
      title: 'What do you study?',
      hint: 'Every study background is welcome.',
      options: [
        { v: 'education', label: 'Education & teaching', score: { edu: 3, social: 1, comm: 1 }, phrase: 'you study education' },
        { v: 'social',    label: 'Social work & psychology', score: { social: 3, comm: 2, edu: 1 }, phrase: 'you study people and how they grow' },
        { v: 'bio',       label: 'Biology & environment', score: { wild: 3, sustain: 2 }, phrase: 'you study the living world' },
        { v: 'media',     label: 'Media, design & communication', score: { media: 3, comm: 1 }, phrase: 'you study media and communication' },
        { v: 'business',  label: 'Business & marketing', score: { comm: 2, sustain: 2, media: 1 }, phrase: 'you study business' },
        { v: 'tourism',   label: 'Tourism & hospitality', score: { sustain: 2, comm: 2, wild: 1 }, phrase: 'you study tourism and hospitality' },
        { v: 'health',    label: 'Health & care', score: { social: 3, comm: 1 }, phrase: 'you study health and care' },
        { v: 'other',     label: 'Something else', score: { edu: 1, comm: 1, media: 1, social: 1, wild: 1, sustain: 1 }, phrase: 'you bring a background of your own' }
      ]
    },
    {
      id: 'day', type: 'slider',
      kicker: 'Picture a good day',
      title: 'Your ideal day is spent with…',
      hint: 'Slide to where you feel most at home.',
      left:  { label: 'People', img: 'classroom-tablet' },
      right: { label: 'Nature', img: 'lioness' }
    },
    {
      id: 'place', type: 'split',
      kicker: 'Two places, two worlds',
      title: "Pick the morning you'd wake up to.",
      hint: 'Go with your gut.',
      options: [
        { v: 'rw', label: 'Mist over a thousand green hills', sub: 'Kigali, Rwanda', img: 'crater-mist', phrase: "you'd wake up to Rwanda's green hills" },
        { v: 'sa', label: 'A kudu at the edge of the bushveld', sub: 'Hoedspruit, South Africa', img: 'kudu', phrase: "you'd wake up in the bushveld" }
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
      title: 'You learn best by…',
      hint: 'Pick the one that sounds most like you.',
      options: [
        { v: 'create',  label: 'Creating',   sub: 'Making things people see and share', score: { media: 3, sustain: 1 }, phrase: 'you learn by creating' },
        { v: 'teach',   label: 'Teaching',   sub: 'Explaining, guiding, helping others grow', score: { edu: 3, social: 1 }, phrase: 'you learn by teaching' },
        { v: 'build',   label: 'Building',   sub: 'Turning ideas into projects that last', score: { comm: 3, sustain: 2 }, phrase: 'you learn by building' },
        { v: 'protect', label: 'Protecting', sub: 'Looking after people, animals and places', score: { wild: 3, social: 2 }, phrase: 'you learn by protecting' }
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
