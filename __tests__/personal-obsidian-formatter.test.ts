import PersonalObsidianFormatter from '../src/rules/personal-obsidian-formatter';
import {formatPersonalObsidianMarkdown} from '../src/utils/personal-obsidian-formatter';
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
      testName: 'Empty input currently normalizes to a final newline',
      before: '',
      after: '\n',
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
      testName: 'Callout blocks keep one blank line before and after',
      before: dedent`
        Before
        > [!eg] A
        > Content
        After
        ${''}
        ${''}
        > [!note] B
        > Content
        ${''}
        ${''}
        After again
      `,
      after: dedent`
        Before
        ${''}
        > [!eg] A
        > Content
        ${''}
        After
        ${''}
        > [!note] B
        > Content
        ${''}
        After again
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
      testName: 'LaTeX cdot commands are not treated as line breaks',
      before: dedent`
        $$
        \\begin{aligned}
        &=
        \\begin{cases}
        \\displaystyle
        \\frac{(n-1)(n-3) \\cdots 3\\cdot 1}
        \\end{cases}
        \\end{aligned}
        $$
      `,
      after: dedent`
        $$
        \\begin{aligned}
        &=
        \\begin{cases}
        \\displaystyle
        \\frac{(n-1)(n-3) \\cdots 3\\cdot 1}
        \\end{cases}
        \\end{aligned}
        $$
      ` + '\n',
    },
    {
      testName: 'LaTeX cdot commands do not prevent simple equation normalization',
      before: dedent`
        $$
        x
        \\cdot
        y
        $$
      `,
      after: dedent`
        $$
        x \\cdot y
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
      testName: 'Block math separated from callout by a blank line stays outside callout',
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
    },
    {
      testName: 'Inline math paragraph immediately after callout moves into callout',
      before: dedent`
        > [!warning] 双无穷区间不能直接合并极限
        $\\displaystyle \\int_{-\\infty}^{+\\infty}f(x)\\,dx$ 收敛，要求左右两边分别收敛。
        不能只算 $\\displaystyle \\lim_{A\\to\\infty}\\int_{-A}^{A}f(x)\\,dx$。
      `,
      after: dedent`
        > [!warning] 双无穷区间不能直接合并极限
        > $\\displaystyle \\int_{-\\infty}^{+\\infty}f(x)\\,dx$ 收敛，要求左右两边分别收敛。
        > 不能只算 $\\displaystyle \\lim_{A\\to\\infty}\\int_{-A}^{A}f(x)\\,dx$。
      ` + '\n',
    },
    {
      testName: 'Inline math paragraph separated from callout by a blank line stays outside callout',
      before: dedent`
        > [!warning] 双无穷区间不能直接合并极限

        $\\displaystyle \\int_{-\\infty}^{+\\infty}f(x)\\,dx$ 收敛，要求左右两边分别收敛。
      `,
      after: dedent`
        > [!warning] 双无穷区间不能直接合并极限

        $\\displaystyle \\int_{-\\infty}^{+\\infty}f(x)\\,dx$ 收敛，要求左右两边分别收敛。
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
      testName: 'Math sections separated by blank lines do not continue moving into callout',
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

        $$
        z + 1 = w
        $$
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
      testName: 'Callout syntax inside block math does not get callout spacing',
      before: dedent`
        $$
        > [!warning] 双无穷区间不能直接合并极限
        $\\displaystyle \\int_{-\\infty}^{+\\infty}f(x)\\,dx$ 收敛，要求左右两边分别收敛。
        不能只算 $\\displaystyle \\lim_{A\\to\\infty}\\int_{-A}^{A}f(x)\\,dx$。
        $$
      `,
      after: dedent`
        $$
        > [!warning] 双无穷区间不能直接合并极限
        $\\displaystyle \\int_{-\\infty}^{+\\infty}f(x)\\,dx$ 收敛，要求左右两边分别收敛。
        不能只算 $\\displaystyle \\lim_{A\\to\\infty}\\int_{-A}^{A}f(x)\\,dx$。
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
      testName: 'Block math immediately after callout stays outside callout with keep strategy',
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
        mathPlacement: 'keep',
      },
    },
    {
      testName: 'Legacy rule config key still moves callout math outside when disabled',
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
        'move-math-into-callout': false,
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
      testName: 'Unclosed code fences conservatively protect the rest of the file',
      before: '```md\n$$\nx + 1\n=\ny',
      after: '```md\n$$\nx + 1\n=\ny\n',
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
    {
      testName: 'Tag-only lines do not count as heading block content',
      before: dedent`
        # 3 最大公约数算法
        #算法
        ${''}
        ## 3.1 最大公约数的定义
        正文
        ${''}
        ## 3.2 嵌套标签
        #数学/微积分
        ${''}
        ## 3.3 多个标签
        #数学/微积分 #算法
        ${''}
        ### 3.3.1 子标题
      `,
      after: dedent`
        # 3 最大公约数算法
        #算法
        ## 3.1 最大公约数的定义
        正文
        ## 3.2 嵌套标签
        #数学/微积分
        ## 3.3 多个标签
        #数学/微积分 #算法
        ### 3.3.1 子标题
      ` + '\n',
    },
  ],
});

describe('Personal Obsidian formatter behavior freeze', () => {
  const idempotentSamples = [
    dedent`
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
    dedent`
      ## 标题1

      正文


      ## 标题2
      #数学/微积分

      ### 标题3
    `,
    dedent`
      \`\`\`md
      $$
      x + 1
      =
      y
      $$
      \`\`\`

      Here is {漢字|かんじ}.
      $D$开头。
    `,
  ];

  it.each(idempotentSamples)('is idempotent for frozen sample %#', (sample) => {
    const formatted = formatPersonalObsidianMarkdown(sample);

    expect(formatPersonalObsidianMarkdown(formatted)).toBe(formatted);
  });

  it('protects inline code spans from inline math spacing', () => {
    const sample = 'Use `这是$A_i$同时发生` as literal code.\n';

    expect(formatPersonalObsidianMarkdown(sample)).toBe(sample);
  });

  it('protects URL query strings from inline math spacing', () => {
    const sample = 'See https://example.com/search?q=$A_i$&lang=ja for details.\n';

    expect(formatPersonalObsidianMarkdown(sample)).toBe(sample);
  });

  it('protects currency-like dollar amounts from inline math spacing', () => {
    const sample = 'The range is $5 and $6 today.\n';

    expect(formatPersonalObsidianMarkdown(sample)).toBe(sample);
  });

  it('keeps callout math placement unchanged with explicit keep strategy', () => {
    const sample = dedent`
      > [!eg] Example title
      > Content
      $$
      x + 1 = y
      $$
    ` + '\n';

    expect(formatPersonalObsidianMarkdown(sample, {mathPlacement: 'keep'})).toBe(dedent`
      > [!eg] Example title
      > Content

      $$
      x + 1 = y
      $$
    ` + '\n');
  });

  it('moves callout math out with explicit move-out strategy', () => {
    const sample = dedent`
      > [!eg] Example title
      > Content
      > $$
      > x + 1 = y
      > $$
      > More content
    ` + '\n';

    expect(formatPersonalObsidianMarkdown(sample, {mathPlacement: 'move-out-of-callout'})).toBe(dedent`
      > [!eg] Example title
      > Content

      $$
      x + 1 = y
      $$
      > More content
    ` + '\n');
  });
});
