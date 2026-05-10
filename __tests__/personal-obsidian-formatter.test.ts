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
      testName: 'LaTeX environment boundaries are moved to their own lines in block math',
      before: dedent`
        $$
        \\begin{cases} \\sin^2 x + \\cos^2 x = 1 \\\\
        1 + \\tan^2 x = \\frac{1}{\\cos^2 x} = \\sec^2 x \\end{cases}
        $$
      `,
      after: dedent`
        $$
        \\begin{cases}
        \\sin^2 x + \\cos^2 x = 1 \\\\
        1 + \\tan^2 x = \\frac{1}{\\cos^2 x} = \\sec^2 x
        \\end{cases}
        $$
      ` + '\n',
    },
    {
      testName: 'Single-line dollar math is expanded outside list items',
      before: '$$\\begin{aligned} x &= y \\\\ z &= w \\end{aligned}$$\n',
      after: dedent`
        $$
        \\begin{aligned}
        x &= y \\\\
        z &= w
        \\end{aligned}
        $$
      ` + '\n',
    },
    {
      testName: 'Single-line dollar math remains unchanged in list items',
      before: '- $$\\begin{aligned} x &= y \\\\ z &= w \\end{aligned}$$\n',
      after: '- $$\\begin{aligned} x &= y \\\\ z &= w \\end{aligned}$$\n',
    },
    {
      testName: 'Math fences sharing lines with text are moved to their own lines',
      before: dedent`
        Before text $$
        x
        =
        y
        $$ after text
      `,
      after: dedent`
        Before text
        $$
        x = y
        $$
        after text
      ` + '\n',
    },
    {
      testName: 'Inline math keeps spaces around formula content',
      before: dedent`
        这是$A_i$同时发生。
        $D$开头。
        行尾是$B$
        标点前是$C$。
      `,
      after: dedent`
        这是 $A_i$ 同时发生。
        $D$ 开头。
        行尾是 $B$
        标点前是 $C$。
      ` + '\n',
    },
    {
      testName: 'Inline math spacing does not affect code fences or block math',
      before: dedent`
        \`\`\`md
        这是$A_i$同时发生。
        \`\`\`
        $$
        x_$i$
        $$
      `,
      after: dedent`
        \`\`\`md
        这是$A_i$同时发生。
        \`\`\`
        $$
        x_$i$
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
      testName: 'Multiple block math sections after a callout move into the callout in one pass',
      before: dedent`
        > [!eg] Example title
        > Content
        $$
        x + 1 = y
        $$
        $$
        z + 1 = w
        $$
      `,
      after: dedent`
        > [!eg] Example title
        > Content
        > $$
        > x + 1 = y
        > $$
        > $$
        > z + 1 = w
        > $$
      ` + '\n',
    },
    {
      testName: 'Multiple block math sections after a callout move with blank lines between them',
      before: dedent`
        > [!eg] Example title
        > Content
        $$
        x + 1 = y
        $$

        $$
        z + 1 = w
        $$
        Outside
      `,
      after: dedent`
        > [!eg] Example title
        > Content
        > $$
        > x + 1 = y
        > $$
        > $$
        > z + 1 = w
        > $$
        Outside
      ` + '\n',
    },
    {
      testName: 'Multiple block math sections after continued callout content move in one pass',
      before: dedent`
        > [!eg] Example title
        > Content
        $$
        x + 1 = y
        $$
        > More content
        $$
        z + 1 = w
        $$
        Outside
      `,
      after: dedent`
        > [!eg] Example title
        > Content
        > $$
        > x + 1 = y
        > $$
        > More content
        > $$
        > z + 1 = w
        > $$
        Outside
      ` + '\n',
    },
    {
      testName: 'Multiple block math sections after empty callout quote lines move in one pass',
      before: dedent`
        > [!eg] Example title
        > Content
        $$
        x + 1 = y
        $$
        >
        > More content
        $$
        z + 1 = w
        $$
      `,
      after: dedent`
        > [!eg] Example title
        > Content
        > $$
        > x + 1 = y
        > $$
        > More content
        > $$
        > z + 1 = w
        > $$
      ` + '\n',
    },
    {
      testName: 'Callout followed by a heading does not absorb the heading before following math',
      before: dedent`
        > [!important] 方向性
        > 定积分不仅看“面积大小”，也看积分方向。
        > 从 $a$ 到 $b$ 与从 $b$ 到 $a$ 的路径方向相反，所以符号相反。

        ### 6.4.3 区间可加性 若 $c$ 在 $a,b$ 之间，则
        $$
        \\int_a^b f(x)\\,dx = \\int_a^c f(x)\\,dx+\\int_c^b f(x)\\,dx.
        $$
      `,
      after: dedent`
        > [!important] 方向性
        > 定积分不仅看“面积大小”，也看积分方向。
        > 从 $a$ 到 $b$ 与从 $b$ 到 $a$ 的路径方向相反，所以符号相反。
        ### 6.4.3 区间可加性 若 $c$ 在 $a,b$ 之间，则
        $$
        \\int_a^b f(x)\\,dx = \\int_a^c f(x)\\,dx+\\int_c^b f(x)\\,dx.
        $$
      ` + '\n',
    },
    {
      testName: 'Math normalization does not collapse callouts or headings when math fences are mixed with markdown blocks',
      before: dedent`
        $$
        > [!important] 方向性
        > 定积分不仅看“面积大小”，也看积分方向。
        ### 6.4.3 区间可加性
        $$
      `,
      after: dedent`
        $$
        > [!important] 方向性
        > 定积分不仅看“面积大小”，也看积分方向。
        ### 6.4.3 区间可加性
        $$
      ` + '\n',
    },
    {
      testName: 'Block math moved into callout strips existing blockquote markers from math lines',
      before: dedent`
        > [!eg] Example title
        > Content
        $$
        >
        \\begin{aligned}
        > &x = y \\\\
        > > &z = w
        >
        \\end{aligned}
        $$
      `,
      after: dedent`
        > [!eg] Example title
        > Content
        > $$
        > \\begin{aligned}
        > &x = y \\\\
        > &z = w
        > \\end{aligned}
        > $$
      ` + '\n',
    },
    {
      testName: 'Existing callout block math keeps quote prefixes outside math content',
      before: dedent`
        > [!eg] Example title
        > Content
        > $$
        > \\frac{y'}{y} = \\ln\\left(\\frac{x}{1+x}\\right)+x\\cdot \\frac{d}{dx}\\left[\\ln\\left(\\frac{x}{1+x}\\right)\\right]
        > $$
      `,
      after: dedent`
        > [!eg] Example title
        > Content
        > $$
        > \\frac{y'}{y} = \\ln\\left(\\frac{x}{1+x}\\right)+x\\cdot \\frac{d}{dx}\\left[\\ln\\left(\\frac{x}{1+x}\\right)\\right]
        > $$
      ` + '\n',
    },
    {
      testName: 'Existing callout block math drops empty quote lines without appending them to math',
      before: dedent`
        > [!eg] Example title
        > Content
        > $$
        > \\frac{y'}{y} = \\ln\\left(\\frac{x}{1+x}\\right)+x\\cdot \\frac{d}{dx}\\left[\\ln\\left(\\frac{x}{1+x}\\right)\\right]
        >
        > $$
      `,
      after: dedent`
        > [!eg] Example title
        > Content
        > $$
        > \\frac{y'}{y} = \\ln\\left(\\frac{x}{1+x}\\right)+x\\cdot \\frac{d}{dx}\\left[\\ln\\left(\\frac{x}{1+x}\\right)\\right]
        > $$
      ` + '\n',
    },
    {
      testName: 'Existing callout aligned block keeps quote prefixes on ampersand lines',
      before: dedent`
        > [!eg] 求 $\\displaystyle \\int x\\cos x\\,dx$
        > $$
        > \\begin{aligned}
        > \\int x \\,d\\sin x
        > &=x\\sin x-\\int \\sin x\\,dx \\\\
        > &=x\\sin x+\\cos x+C.
        > \\end{aligned}
        > $$
      `,
      after: dedent`
        > [!eg] 求 $\\displaystyle \\int x\\cos x\\,dx$
        > $$
        > \\begin{aligned}
        > \\int x \\,d\\sin x
        > &=x\\sin x-\\int \\sin x\\,dx \\\\
        > &=x\\sin x+\\cos x+C.
        > \\end{aligned}
        > $$
      ` + '\n',
    },
    {
      testName: 'Callout math fences with uneven spacing close at the same quote depth',
      before: dedent`
        > [!eg] Example title
        > Content
        >  $$
        > x
        > =
        > y
        > $$
        Outside
      `,
      after: dedent`
        > [!eg] Example title
        > Content
        > $$
        > x = y
        > $$
        Outside
      ` + '\n',
    },
    {
      testName: 'Empty blockquote lines are removed',
      before: dedent`
        > [!eg] Example title
        >
        > Content
        > 
        > >
        > More content
      `,
      after: dedent`
        > [!eg] Example title
        > Content
        > More content
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
      testName: 'Block math inside callout moves outside callout when disabled',
      before: dedent`
        > [!eg] Example title
        > Content
        > $$
        > x + 1 = y
        > $$
        > More content
      `,
      after: dedent`
        > [!eg] Example title
        > Content
        $$
        x + 1 = y
        $$
        > More content
      ` + '\n',
      options: {
        moveMathIntoCallout: false,
      },
    },
    {
      testName: 'Multiple block math sections inside callout move outside callout when disabled',
      before: dedent`
        > [!eg] Example title
        > Content
        > $$
        > x + 1 = y
        > $$
        > $$
        > z + 1 = w
        > $$
      `,
      after: dedent`
        > [!eg] Example title
        > Content
        $$
        x + 1 = y
        $$
        $$
        z + 1 = w
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
      testName: 'Empty blockquote lines in code fences are unchanged',
      before: '```md\n>\n> \n```\n',
      after: '```md\n>\n> \n```\n',
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
