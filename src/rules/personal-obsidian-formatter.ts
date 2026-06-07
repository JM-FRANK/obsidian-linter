import {Options, RuleType} from '../rules';
import RuleBuilder, {DropdownOptionBuilder, ExampleBuilder, OptionBuilderBase} from './rule-builder';
import dedent from 'ts-dedent';
import {formatPersonalObsidianMarkdown} from '../utils/personal-obsidian-formatter';
import {CalloutMathPlacement} from '../utils/personal-formatter/types';

class PersonalObsidianFormatterOptions implements Options {
  mathPlacement: CalloutMathPlacement = 'move-into-callout';
}

@RuleBuilder.register
export default class PersonalObsidianFormatter extends RuleBuilder<PersonalObsidianFormatterOptions> {
  constructor() {
    super({
      nameKey: 'rules.personal-obsidian-formatter.name',
      descriptionKey: 'rules.personal-obsidian-formatter.description',
      type: RuleType.SPACING,
    });
  }

  get OptionsClass(): new () => PersonalObsidianFormatterOptions {
    return PersonalObsidianFormatterOptions;
  }

  buildRuleOptions(options?: Options): PersonalObsidianFormatterOptions {
    const ruleOptions = super.buildRuleOptions(options);
    const legacyMoveMathIntoCallout = options?.['move-math-into-callout'] ?? options?.moveMathIntoCallout;

    if (legacyMoveMathIntoCallout !== undefined && options?.['math-placement'] === undefined && options?.mathPlacement === undefined) {
      ruleOptions.mathPlacement = legacyMoveMathIntoCallout ? 'move-into-callout' : 'move-out-of-callout';
    }

    return ruleOptions;
  }

  apply(text: string, options: PersonalObsidianFormatterOptions): string {
    return formatPersonalObsidianMarkdown(text, {
      mathPlacement: options.mathPlacement,
    });
  }

  get exampleBuilders(): ExampleBuilder<PersonalObsidianFormatterOptions>[] {
    return [
      new ExampleBuilder({
        description: 'Formats a compact Obsidian note while preserving custom syntax.',
        before: dedent`
          Text
          | A | B |
          |---|---|
          | 1 | 2 |
          > [!eg] Example
          > Content
          $$
          x + 1
          =
          y
          $$
        `,
        after: dedent`
          Text
          ${''}
          | A | B |
          |---|---|
          | 1 | 2 |
          ${''}
          > [!eg] Example
          > Content
          > $$
          > x + 1 = y
          > $$
        ` + '\n',
      }),
    ];
  }
  get optionBuilders(): OptionBuilderBase<PersonalObsidianFormatterOptions>[] {
    return [
      new DropdownOptionBuilder<PersonalObsidianFormatterOptions, CalloutMathPlacement>({
        OptionsClass: PersonalObsidianFormatterOptions,
        nameKey: 'rules.personal-obsidian-formatter.math-placement.name',
        descriptionKey: 'rules.personal-obsidian-formatter.math-placement.description',
        optionsKey: 'mathPlacement',
        records: [
          {
            value: 'move-into-callout',
            description: 'Immediately following math belongs to the preceding callout.',
          },
          {
            value: 'keep',
            description: 'Only normalize spacing; do not move math into or out of callouts.',
          },
          {
            value: 'move-out-of-callout',
            description: 'Block math inside callouts is moved back outside the callout.',
          },
        ],
      }),
    ];
  }
}
