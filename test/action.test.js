import { describe, it, expect, vi } from 'vitest';
import { Action, GoalStatus, Ros } from '../src/RosLib.js';

const setup = () => {
  const ros = new Ros();
  const sent = [];
  ros.callOnConnection = (message) => sent.push(message);
  const action = new Action({ ros, name: '/test', actionType: 'test/action/Test' });
  return { ros, sent, action };
};

const sendGoal = (action) => {
  const callbacks = { result: vi.fn(), feedback: vi.fn(), failed: vi.fn() };
  const id = action.sendGoal({}, callbacks.result, callbacks.feedback, callbacks.failed, 'goal-id');
  return { id, ...callbacks };
};

describe('Action', () => {
  it('calls the result callback when the goal succeeds', () => {
    const { ros, action } = setup();
    const goal = sendGoal(action);
    ros.emit(goal.id, { op: 'action_result', id: goal.id, values: { x: 1 }, status: GoalStatus.STATUS_SUCCEEDED, result: true });
    expect(goal.result).toHaveBeenCalledWith({ x: 1 });
    expect(goal.failed).not.toHaveBeenCalled();
  });

  it('calls the failed callback with the status and result when the goal finishes without succeeding', () => {
    const { ros, action } = setup();
    const goal = sendGoal(action);
    ros.emit(goal.id, { op: 'action_result', id: goal.id, values: { x: 1 }, status: GoalStatus.STATUS_CANCELED, result: true });
    expect(goal.result).not.toHaveBeenCalled();
    expect(goal.failed).toHaveBeenCalledWith(expect.any(String), GoalStatus.STATUS_CANCELED, { x: 1 });
  });

  it('calls the failed callback with the error and status when the goal fails', () => {
    const { ros, action } = setup();
    const goal = sendGoal(action);
    ros.emit(goal.id, { op: 'action_result', id: goal.id, values: 'boom', status: GoalStatus.STATUS_ABORTED, result: false });
    expect(goal.result).not.toHaveBeenCalled();
    expect(goal.failed).toHaveBeenCalledWith('boom', GoalStatus.STATUS_ABORTED);
  });

  it('calls the feedback callback on feedback', () => {
    const { ros, action } = setup();
    const goal = sendGoal(action);
    ros.emit(goal.id, { op: 'action_feedback', id: goal.id, values: { progress: 1 } });
    expect(goal.feedback).toHaveBeenCalledWith({ progress: 1 });
  });

  it('stops listening once the result arrives', () => {
    const { ros, action } = setup();
    const goal = sendGoal(action);
    ros.emit(goal.id, { op: 'action_result', id: goal.id, values: {}, status: GoalStatus.STATUS_SUCCEEDED, result: true });
    expect(ros.listenerCount(goal.id)).toBe(0);
  });

  it('sends the status with the server results', () => {
    const { sent, action } = setup();
    action.setSucceeded('a', { x: 1 });
    action.setCanceled('b', { x: 2 });
    action.setFailed('c');
    expect(sent).toEqual([
      { op: 'action_result', id: 'a', action: '/test', values: { x: 1 }, status: GoalStatus.STATUS_SUCCEEDED, result: true },
      { op: 'action_result', id: 'b', action: '/test', values: { x: 2 }, status: GoalStatus.STATUS_CANCELED, result: true },
      { op: 'action_result', id: 'c', action: '/test', status: GoalStatus.STATUS_ABORTED, result: false },
    ]);
  });
});
