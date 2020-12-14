import * as A from "@principia/core/Array";
import * as BA from "@principia/core/FreeBooleanAlgebra";
import type { Cause } from "@principia/core/IO/Cause";
import * as C from "@principia/core/IO/Cause";
import type { NonEmptyArray } from "@principia/core/NonEmptyArray";
import type { Option } from "@principia/core/Option";
import * as O from "@principia/core/Option";
import type { USync } from "@principia/core/Sync";
import * as Sy from "@principia/core/Sync";

import type { AssertionValue } from "../AssertionValue";
import type { FailureDetails } from "../FailureDetails";
import type { GenFailureDetails } from "../GenFailureDetails";
import { TestTimeoutException } from "../TestTimeoutException";
import { tabSize } from "./RenderUtils";

export class Message {
  constructor(readonly lines: ReadonlyArray<Line> = []) {}

  ["+:"](line: Line): Message {
    return new Message(A.prepend(line)(this.lines));
  }
  [":+"](line: Line): Message {
    return new Message(A.append(line)(this.lines));
  }
  ["++"](message: Message): Message {
    return new Message(A.concat_(this.lines, message.lines));
  }
  drop(n: number): Message {
    return new Message(A.drop_(this.lines, n));
  }
  map(f: (_: Line) => Line): Message {
    return new Message(A.map_(this.lines, f));
  }
  withOffset(offset: number): Message {
    return new Message(A.map_(this.lines, (l) => l.withOffset(offset)));
  }
  static empty = new Message();
}

export class Line {
  constructor(readonly fragments: ReadonlyArray<Fragment> = [], readonly offset: number = 0) {}

  [":+"](fragment: Fragment): Line {
    return new Line(A.append(fragment)(this.fragments));
  }
  prepend(this: Line, message: Message): Message {
    return new Message(A.prepend(this)(message.lines));
  }
  ["+"](fragment: Fragment): Line {
    return new Line(A.append(fragment)(this.fragments));
  }
  ["+|"](line: Line): Message {
    return new Message([this, line]);
  }
  ["++"](line: Line): Line {
    return new Line(A.concat_(this.fragments, line.fragments), this.offset);
  }
  withOffset(shift: number): Line {
    return new Line(this.fragments, this.offset + shift);
  }
  toMessage(): Message {
    return new Message([this]);
  }

  static fromString(text: string, offset = 0): Line {
    return new Fragment(text).toLine().withOffset(offset);
  }

  static empty = new Line();
}

export class Fragment {
  constructor(readonly text: string, readonly colorCode: string = "") {}

  ["+:"](line: Line): Line {
    return this.prependTo(line);
  }
  prependTo(this: Fragment, line: Line): Line {
    return new Line(A.prepend(this)(line.fragments), line.offset);
  }
  ["+"](f: Fragment): Line {
    return new Line([this, f]);
  }
  toLine(): Line {
    return new Line([this]);
  }
}

export function renderFailureDetails(failureDetails: FailureDetails, offset: number): Message {
  return renderGenFailureDetails(failureDetails.gen, offset)["++"](
    renderAssertionFailureDetails(failureDetails.assertion, offset)
  );
}

function renderAssertionFailureDetails(
  failureDetails: NonEmptyArray<AssertionValue<any>>,
  offset: number
): Message {
  const loop = (
    failureDetails: ReadonlyArray<AssertionValue<any>>,
    rendered: Message
  ): USync<Message> => {
    return Sy.gen(function* (_) {
      const [fragment, whole, ...details] = failureDetails;
      if (fragment != null && whole != null && details.length > 0) {
        return yield* _(
          loop([whole, ...failureDetails], rendered["+:"](renderWhole(fragment, whole, offset)))
        );
      } else {
        return rendered;
      }
    });
  };

  return renderFragment(failureDetails[0], offset)
    .toMessage()
    ["++"](Sy.runIO(loop(failureDetails, Message.empty)));
}

function renderWhole(
  fragment: AssertionValue<any>,
  whole: AssertionValue<any>,
  offset: number
): Line {
  return withOffset(offset + tabSize)(
    blue(`${whole.value}`)
      ["+"](renderSatisfied(whole))
      ["++"](highlight(cyan(whole.assertion().toString()), fragment.assertion().toString()))
  );
}

function renderGenFailureDetails(
  failureDetails: Option<GenFailureDetails>,
  offset: number
): Message {
  return O.fold_(
    failureDetails,
    () => Message.empty,
    (details) => {
      const shrunken = `${details.shrunkenInput}`;
      const initial = `${details.initialInput}`;
      const renderShrunken = withOffset(offset + tabSize)(
        new Fragment(
          `Test failed after ${details.iterations + 1} iteration${
            details.iterations > 0 ? "s" : ""
          } with input: `
        )["+"](red(shrunken))
      );

      return initial === shrunken
        ? renderShrunken.toMessage()
        : renderShrunken["+|"](
            withOffset(offset + tabSize)(
              new Fragment("Original input before shrinking was: ")["+"](red(initial))
            )
          );
    }
  );
}

function renderFragment(fragment: AssertionValue<any>, offset: number): Line {
  return withOffset(offset + tabSize)(
    blue(`${fragment.value}`)
      ["+"](renderSatisfied(fragment))
      ["+"](cyan(fragment.assertion().toString()))
  );
}

function highlight(fragment: Fragment, substring: string, colorCode = "\u001B[33m"): Line {
  const parts = fragment.text.split(`"${substring}"`);
  if (parts.length === 1) return fragment.toLine();
  else {
    return A.reduce_(parts, Line.empty, (line, part) =>
      line.fragments.length < parts.length * 2 - 2
        ? line["+"](new Fragment(part, fragment.colorCode))["+"](new Fragment(substring, colorCode))
        : line["+"](new Fragment(part, fragment.colorCode))
    );
  }
}

function renderSatisfied(fragment: AssertionValue<any>): Fragment {
  return BA.isTrue(fragment.result())
    ? new Fragment(" satisfied ")
    : new Fragment(" did not satisfy ");
}

export function renderCause(cause: Cause<any>, offset: number): Message {
  const printCause = () =>
    new Message(
      A.map_(C.pretty(cause).split("\n"), (s) => withOffset(offset + tabSize)(Line.fromString(s)))
    );
  return O.fold_(C.dieOption(cause), printCause, (_) => {
    if (_ instanceof TestTimeoutException) {
      return new Fragment(_.message).toLine().toMessage();
    } else {
      return printCause();
    }
  });
}

function withOffset(i: number): (line: Line) => Line {
  return (line) => line.withOffset(i);
}

function blue(s: string): Fragment {
  return new Fragment(s, "\u001B[34m");
}

function red(s: string): Fragment {
  return new Fragment(s, "\u001B[31m");
}

function cyan(s: string): Fragment {
  return new Fragment(s, "\u001B[36m");
}
