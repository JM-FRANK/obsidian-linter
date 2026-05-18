import {defaultPersonalFormatterProfile, resolvePersonalFormatterProfile} from '../src/utils/personal-formatter/profile';

describe('personal formatter profile', () => {
  it('uses move-into-callout as the default math placement', () => {
    expect(resolvePersonalFormatterProfile().callout.mathPlacement).toBe('move-into-callout');
  });

  it('maps the legacy boolean option to the historical move-out behavior', () => {
    expect(resolvePersonalFormatterProfile({moveMathIntoCallout: false}).callout.mathPlacement).toBe('move-out-of-callout');
    expect(resolvePersonalFormatterProfile({moveMathIntoCallout: true}).callout.mathPlacement).toBe('move-into-callout');
  });

  it('lets explicit math placement override the legacy boolean option', () => {
    expect(resolvePersonalFormatterProfile({
      mathPlacement: 'keep',
      moveMathIntoCallout: false,
    }).callout.mathPlacement).toBe('keep');
  });

  it('does not mutate the default profile while resolving options', () => {
    const profile = resolvePersonalFormatterProfile({mathPlacement: 'move-out-of-callout'});

    expect(profile).not.toBe(defaultPersonalFormatterProfile);
    expect(profile.callout).not.toBe(defaultPersonalFormatterProfile.callout);
    expect(defaultPersonalFormatterProfile.callout.mathPlacement).toBe('move-into-callout');
  });
});
