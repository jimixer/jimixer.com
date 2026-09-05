import { describe, expect, it } from "vitest";

import { capturedAtFromFilename, isValidCapturedAt } from "../captured-at";

describe("capturedAtFromFilename", () => {
  it("VRChat のファイル名から撮影日時を読む", () => {
    expect(
      capturedAtFromFilename("VRChat_2026-03-15_04-14-08.830_1080x1920.png")
    ).toBe("2026-03-15T04:14:08");
  });

  it("編集後のファイル名でも読める", () => {
    expect(
      capturedAtFromFilename("VRChat_2026-02-06_03-38-25.566_1920x1080_EDIT.png")
    ).toBe("2026-02-06T03:38:25");
  });

  it("読めないファイル名では null を返す（更新日時で代用しない）", () => {
    expect(capturedAtFromFilename("IMG_0421.png")).toBeNull();
    expect(capturedAtFromFilename("milltina-01.webp")).toBeNull();
  });
});

describe("isValidCapturedAt", () => {
  it("秒までのローカル時刻だけを受け付ける", () => {
    expect(isValidCapturedAt("2026-03-15T04:14:08")).toBe(true);
  });

  it("秒が無い datetime-local の既定値は弾く", () => {
    expect(isValidCapturedAt("2026-03-15T04:14")).toBe(false);
  });

  it("タイムゾーン付きは弾く", () => {
    expect(isValidCapturedAt("2026-03-15T04:14:08Z")).toBe(false);
  });

  it("存在しない日付は弾く", () => {
    expect(isValidCapturedAt("2026-02-30T04:14:08")).toBe(false);
  });
});
