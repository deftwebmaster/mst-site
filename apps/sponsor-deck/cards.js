/* Original Sponsor Deck prompts. No AA literature is reproduced. */
window.DECK = (() => {
  const groups = {
    honesty: [
      ['The whole picture', 'Where have you told the truth but left someone with the wrong impression?', 'What would a fuller, kinder version of the truth sound like?'],
      ['The edited version', 'What part of your week are you tempted to edit out when we talk?', 'What makes that part difficult to share?'],
      ['Small omissions', 'Which small omission is taking more energy to maintain than you expected?', 'What is one safe way to stop maintaining it?'],
      ['Being believed', 'When does wanting to be believed matter more to you than being accurate?', 'How could you make room for uncertainty?'],
      ['An honest no', 'Where have you said yes when your honest answer was no?', 'What boundary would make your answer more truthful?'],
      ['Telling yourself', 'What explanation do you keep giving yourself that no longer fits the facts?', 'What changes if you let that explanation go?']
    ],
    willingness: [
      ['A small opening', 'What useful suggestion have you dismissed before actually trying it?', 'What would a small, time-limited experiment look like?'],
      ['Ready enough', 'What are you waiting to feel ready for?', 'What could you do before the feeling arrives?'],
      ['Your terms', 'Where are you willing to change only if you can control the outcome?', 'What part of the process could you practice anyway?'],
      ['The next inch', 'What is one thing you could become a little more willing to do today?', 'How small would the first action need to be?'],
      ['A different approach', 'What familiar approach keeps giving you the same unwanted result?', 'Who could help you try a different approach?'],
      ['Accepting help', 'What kind of help do you find hardest to receive?', 'What would accepting it ask you to let go of?']
    ],
    character: [
      ['The protection underneath', 'Which recurring behavior causes trouble but also seems to protect you?', 'What need could you meet in a less harmful way?'],
      ['Defensiveness', 'What tends to happen just before you become defensive?', 'How could you notice that moment earlier?'],
      ['The hidden bargain', 'When you help someone, what do you sometimes hope to get in return?', 'How would your help change without that expectation?'],
      ['Fear in disguise', 'Where might fear be showing up as control, criticism, or withdrawal?', 'What could you say about the fear itself?'],
      ['A familiar pattern', 'Which pattern follows you into otherwise very different situations?', 'What part of the pattern is yours to interrupt?'],
      ['Practice the opposite', 'What quality would you like to practice when an old habit appears?', 'What would that quality look like in one ordinary action?']
    ],
    humility: [
      ['Room to learn', 'When did you last let someone teach you something you thought you already knew?', 'What made listening possible?'],
      ['Without the performance', 'Where do you feel pressure to look further along than you are?', 'What might happen if you described where you actually are?'],
      ['Being corrected', 'What makes a correction feel like a verdict on your worth?', 'How could you separate useful feedback from that feeling?'],
      ['Your actual size', 'Where are you taking too much responsibility, or too little?', 'What would taking your fair share look like?'],
      ['An unfinished answer', 'What question can you honestly answer with “I do not know” today?', 'Who or what might help you keep learning?'],
      ['Quiet progress', 'What progress matters even if nobody notices it?', 'How can you recognize it without needing applause?']
    ],
    relationships: [
      ['The unspoken request', 'What are you expecting someone to understand without having told them?', 'How could you make a clear request and allow a real answer?'],
      ['Staying on your side', 'In a difficult relationship, what is yours to change?', 'What belongs to the other person to decide?'],
      ['Connection or approval', 'Where are you trading honesty for approval?', 'What would a more honest connection require?'],
      ['Listening to understand', 'Who have you been preparing a reply to instead of listening to?', 'What question could help you understand their experience?'],
      ['A useful boundary', 'Which boundary would help you be more consistent and less resentful?', 'How could you communicate it without punishment or threats?'],
      ['Repair with care', 'Where might a wish to feel forgiven be moving faster than the other person’s readiness?', 'How could you respect their pace and safety?']
    ],
    accountability: [
      ['The next check-in', 'What commitment would you like us to ask about next time?', 'What would count as a realistic effort?'],
      ['When plans slip', 'What do you usually do after you miss a commitment?', 'What would returning promptly look like this time?'],
      ['Clear agreements', 'Which expectation between us needs to be said out loud?', 'What can each of us realistically agree to?'],
      ['Asking sooner', 'What signs tell you that you need support before things become urgent?', 'Who could you contact when you notice the first sign?'],
      ['Effort and outcome', 'What did you follow through on even though the result disappointed you?', 'What can you learn without discounting the effort?'],
      ['A truthful update', 'Where do you owe someone a clear update about a promise you made?', 'What can you communicate today?']
    ],
    service: [
      ['Useful and available', 'What can you offer today that someone actually needs?', 'How could you ask instead of assuming?'],
      ['Without recognition', 'What helpful task would you still do if nobody knew it was you?', 'What makes that kind of service meaningful?'],
      ['Making room', 'How could you help a newcomer feel included without overwhelming them?', 'What did you need when you were new?'],
      ['A sustainable yes', 'Where does your service fit your actual capacity, and where does it exceed it?', 'What adjustment would help you keep showing up?'],
      ['Sharing experience', 'When does sharing your experience turn into telling someone how to live?', 'How can you offer something useful and leave them room to choose?'],
      ['Receiving is part of it', 'How do you respond when someone offers to do something for you?', 'What might letting them help make possible for both of you?']
    ],
    spirituality: [
      ['Your own language', 'What words for spiritual life feel honest to you right now?', 'Which words feel borrowed or uncomfortable?'],
      ['Beyond self-reliance', 'What helps you feel less alone with a problem you cannot solve by yourself?', 'How could you make contact with that support today?'],
      ['A moment of quiet', 'What becomes easier to notice when you pause before acting?', 'What kind of pause could fit into your day?'],
      ['Belief and practice', 'Is there a practice that helps you even while your beliefs are uncertain?', 'What do you notice before and after doing it?'],
      ['Letting go of control', 'Where are you confusing caring deeply with controlling the result?', 'What action could express care while leaving the outcome open?'],
      ['Values in motion', 'Which value would you like your actions to express more clearly?', 'What ordinary choice could express it today?']
    ]
  };
  const cards = Object.entries(groups).flatMap(([topic, items]) => items.map(([title, question, follow], i) => ({ id: `${topic}-${i + 1}`, topic, title, question, follow, step: null })));
  const steps = [
    [['Seeing the pattern', 'What has your own experience shown you about trying to manage drinking?', 'What evidence are you still tempted to bargain with?'], ['Accepting support', 'What becomes possible when you stop treating recovery as something you must do alone?', 'What support could you accept this week?']],
    [['A possibility of change', 'What gives you even a small reason to believe change is possible?', 'Can you borrow hope from someone else’s experience for now?'], ['A wider source', 'What sources of guidance are more reliable than your thinking when you are afraid?', 'How can you reach for one of them?']],
    [['Decision into action', 'What would trusting guidance beyond your first impulse look like today?', 'What action would make that decision visible?'], ['The part you can release', 'What outcome are you trying hardest to force?', 'What responsibility can you keep while releasing control of the result?']],
    [['Looking fairly', 'What pattern could you examine without either excusing or condemning yourself?', 'What facts would help you see it more clearly?'], ['More than one feeling', 'Under a resentment, what fear, hurt, or expectation might also be present?', 'What part of your response needs an honest look?']],
    [['Being known', 'What would help you speak honestly with a trustworthy person?', 'What boundaries or agreements would support that conversation?'], ['After sharing', 'What changed when you said something difficult out loud?', 'What still needs attention or clarification?']],
    [['The familiar cost', 'Which behavior are you tired of paying for, even though it still feels familiar?', 'What do you fear losing if it changes?'], ['Readiness in practice', 'What would readiness for change look like in a real situation this week?', 'What support would help you practice it?']],
    [['Help with change', 'Where do you need help becoming the person you want to be?', 'What would asking for that help sound like in your own words?'], ['A gentler stance', 'How does shame affect your ability to change a harmful habit?', 'What could humility make possible that self-attack does not?']],
    [['Seeing the impact', 'Whose experience might you need to understand more fully before considering repair?', 'How can you reflect without contacting them before you are ready?'], ['Becoming willing', 'What gets in the way of becoming willing to take responsibility for harm?', 'What would be useful to discuss with your sponsor first?']],
    [['Careful repair', 'How could an attempt at repair affect the other person, beyond your wish for relief?', 'What guidance and safety considerations need attention before any contact?'], ['Changed behavior', 'Where might consistent changed behavior be an essential part of repair?', 'What would consistency look like over time?']],
    [['Noticing sooner', 'What did you notice about yourself today that you once would have missed?', 'Is there a correction or conversation to make promptly?'], ['A daily return', 'What helps you review your day without turning it into a trial?', 'What can you appreciate as well as take responsibility for?']],
    [['Making space', 'What helps you become quiet enough to hear something beyond your first reaction?', 'How could you make a little room for that tomorrow?'], ['Guidance for today', 'What question could you bring to reflection, prayer, or meditation today?', 'What useful action might follow the pause?']],
    [['Experience to offer', 'What part of your experience could help another person feel less alone?', 'How can you share it without making promises about their outcome?'], ['Beyond the meeting', 'Where could you practice a recovery principle in an ordinary part of your life?', 'What would someone close to you notice?']]
  ];
  steps.forEach((items, i) => items.forEach(([title, question, follow], j) => cards.push({id: `step-${i + 1}-${j + 1}`, topic: 'steps', step: i + 1, title, question, follow})));
  return Object.freeze(cards.map(Object.freeze));
})();
