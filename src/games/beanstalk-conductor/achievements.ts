export type BeanstalkAchievementId =
  | 'first-mass-launch'
  | 'backstory-complete'
  | 'tutorial-complete'
  | 'tether-hit-civic-prime'
  | 'tether-hit-fleet-central';

export type BeanstalkAchievement = {
  id: BeanstalkAchievementId;
  title: string;
};

export const BEANSTALK_ACHIEVEMENTS: BeanstalkAchievement[] = [
  { id: 'first-mass-launch', title: 'Launch a mass' },
  { id: 'backstory-complete', title: 'Read the public works briefing' },
  { id: 'tutorial-complete', title: 'Complete operator training' },
  { id: 'tether-hit-civic-prime', title: 'Make the beanstalk a surface feature' },
  { id: 'tether-hit-fleet-central', title: 'Introduce Fleet Central to the tether directly' },
];
