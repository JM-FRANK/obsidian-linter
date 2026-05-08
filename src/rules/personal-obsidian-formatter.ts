import {Options, RuleType} from '../rules';
import RuleBuilder, {ExampleBuilder, OptionBuilderBase} from './rule-builder';
import dedent from 'ts-dedent';
import {formatPersonalObsidianMarkdown} from '../utils/personal-obsidian-formatter';

class PersonalObsidianFormatterOptions implements Options {}

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

  apply(text: string, options: PersonalObsidianFormatterOptions): string {
    return formatPersonalObsidianMarkdown(text);
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
    return [];
  }
}
