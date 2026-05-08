import PersonalObsidianFormatter from '../src/rules/personal-obsidian-formatter';
import dedent from 'ts-dedent';
import {ruleTest} from './common';

ruleTest({
  RuleBuilderClass: PersonalObsidianFormatter,
  testCases: [
    {
      testName: 'Trailing spaces are trimmed',
      before: '# Title    \nContent    \n',
      after: '# Title\nContent\n',
    },
    {
      testName: 'Redundant blank lines are compacted',
      before: dedent`
        # Title
        ${''}
        ${''}
        Content
        ${''}
        ${''}
        ## Subtitle
        ${''}
        ${''}
        Content
      `,
      after: dedent`
        # Title
        Content
        ${''}
        ## Subtitle
        Content
      ` + '\n',
    },
    {
      testName: 'Table blocks keep one blank line before and after',
      before: dedent`
        Text
        | A | B |
        |---|---|
        | 1 | 2 |
        Text
      `,
      after: dedent`
        Text
        ${''}
        | A | B |
        |---|---|
        | 1 | 2 |
        ${''}
        Text
      ` + '\n',
    },
    {
      testName: 'Adjacent callouts keep one blank line',
      before: dedent`
        > [!eg] A
        > Content
        > [!note] B
        > Content
      `,
      after: dedent`
        > [!eg] A
        > Content
        ${''}
        > [!note] B
        > Content
      ` + '\n',
    },
    {
      testName: 'Ruby syntax remains unchanged',
      before: dedent`
        Here is {漢字|かんじ}.
        Here is {日本語|に|ほん|ご}.
      `,
      after: dedent`
        Here is {漢字|かんじ}.
        Here is {日本語|に|ほん|ご}.
      ` + '\n',
    },
    {
      testName: 'Table-safe ruby syntax remains unchanged',
      before: dedent`
        | Word | Ruby |
        |---|---|
        | 漢字 | {漢字\\|かんじ} |
      `,
      after: dedent`
        | Word | Ruby |
        |---|---|
        | 漢字 | {漢字\\|かんじ} |
      ` + '\n',
    },
    {
      testName: 'Simple broken block math is joined',
      before: dedent`
        $$
        x + 1
        =
        y
        $$
      `,
      after: dedent`
        $$
        x + 1 = y
        $$
      ` + '\n',
    },
    {
      testName: 'LaTeX environment follows line break commands',
      before: dedent`
        $$
        \\begin{aligned}
        x + 1 &= y \\\\ z &= w
        \\end{aligned}
        $$
      `,
      after: dedent`
        $$
        \\begin{aligned}
        x + 1 &= y \\\\
        z &= w
        \\end{aligned}
        $$
      ` + '\n',
    },
    {
      testName: 'Block math immediately after callout moves into callout',
      before: dedent`
        > [!eg] Example title
        > Content
        $$
        x + 1 = y
        $$
      `,
      after: dedent`
        > [!eg] Example title
        > Content
        > $$
        > x + 1 = y
        > $$
      ` + '\n',
    },
    {
      testName: 'Block math immediately after callout stays outside callout when disabled',
      before: dedent`
        > [!eg] Example title
        > Content
        $$
        x + 1 = y
        $$
      `,
      after: dedent`
        > [!eg] Example title
        > Content
        $$
        x + 1 = y
        $$
      ` + '\n',
      options: {
        moveMathIntoCallout: false,
      },
    },
    {
      testName: 'Block math after ordinary text does not move into callout',
      before: dedent`
        > [!eg] Example title
        > Content
        Ordinary text
        $$
        x + 1 = y
        $$
      `,
      after: dedent`
        > [!eg] Example title
        > Content
        Ordinary text
        $$
        x + 1 = y
        $$
      ` + '\n',
    },
    {
      testName: 'Fenced code block content is unchanged',
      before: '```md\n$$\nx + 1\n=\ny\n$$\n```\n',
      after: '```md\n$$\nx + 1\n=\ny\n$$\n```\n',
    },
    {
      testName: 'Comment boundaries remain valid while contents may be formatted',
      before: dedent`
        %%
        $$
        x + 1
        =
        y
        $$
        %%
      `,
      after: dedent`
        %%
        $$
        x + 1 = y
        $$
        %%
      ` + '\n',
    },
    {
      testName: 'Heading block spacing follows the personal one-click strategy',
      before: dedent`
        ## 标题1
        ${''}
        正文
        ${''}
        ${''}
        ## 标题2
        ${''}
        正文
        ${''}
        ### 标题3
        ${''}
        # 标题4
        ${''}
        ## 标题5
        ${''}
        正文
      `,
      after: dedent`
        ## 标题1
        正文
        ## 标题2
        正文
        ${''}
        ### 标题3
        ${''}
        # 标题4
        ## 标题5
        正文
      ` + '\n',
    },
  ],
});
