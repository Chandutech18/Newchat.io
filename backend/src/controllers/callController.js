import Call from '../models/Call.js';
import Notification from '../models/Notification.js';

// @desc Initiate a call record
export const initiateCall = async (req, res) => {
  try {
    if (!req.body.receiverId || !req.body.callType) {
      return res.status(400).json({ message: 'Receiver and call type are required' });
    }

    const call = await Call.create({
      caller: req.user._id,
      receiver: req.body.receiverId,
      callType: req.body.callType,
    });
    await Notification.create({
      user: req.body.receiverId,
      actor: req.user._id,
      call: call._id,
      type: 'call',
      title: `${req.body.callType === 'video' ? 'Video' : 'Audio'} call`,
      body: 'Incoming call',
    }).catch(() => {});
    res.json(call);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Update call status
export const updateCallStatus = async (req, res) => {
  try {
    const update = {
      status: req.body.status,
      duration: req.body.duration || 0,
    };
    if (req.body.status === 'accepted') update.startedAt = new Date();
    if (['ended', 'rejected', 'missed'].includes(req.body.status)) update.endedAt = new Date();

    const call = await Call.findOneAndUpdate({
      _id: req.params.id,
      $or: [{ caller: req.user._id }, { receiver: req.user._id }],
    }, update, { new: true });
    if (!call) return res.status(404).json({ message: 'Call not found' });
    res.json(call);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// @desc Get call history
export const getCallHistory = async (req, res) => {
  try {
    const calls = await Call.find({
      $or: [{ caller: req.user._id }, { receiver: req.user._id }]
    })
      .populate('caller', 'username avatar')
      .populate('receiver', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(calls);
  } catch (err) { res.status(500).json({ message: err.message }); }
};
