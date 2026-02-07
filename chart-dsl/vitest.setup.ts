import '@testing-library/jest-dom';

// Полифилл AbortSignal.any для сред, где его ещё нет (например Node < 20)
if (typeof AbortSignal !== 'undefined' && !(AbortSignal as any).any) {
  (AbortSignal as any).any = function (signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();
    for (const s of signals) {
      if (s?.aborted) {
        controller.abort();
        break;
      }
      s?.addEventListener?.('abort', () => controller.abort());
    }
    return controller.signal;
  };
}
