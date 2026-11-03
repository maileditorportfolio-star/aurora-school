const express = require('express');
const portal = require('../controllers/portal.controller');
const { requireAuth, requirePortal, isTeacher, isPortalUser } = require('../middleware/auth');

const router = express.Router();

const requirePortalOrTeacher = (req, _res, next) => {
  if (!isPortalUser(req.user) && !isTeacher(req.user)) {
    const ApiError = require('../utils/ApiError');
    return next(ApiError.forbidden('Portal access required'));
  }
  next();
};

router.use(requireAuth);

router.get('/overview', requirePortal, portal.overview);
router.get('/attendance', requirePortal, portal.attendance);
router.get('/results', requirePortal, portal.results);
router.get('/fees', requirePortal, portal.fees);
router.get('/timetable', requirePortal, portal.timetable);
router.get('/notices', requireAuth, requirePortalOrTeacher, portal.notices);
router.get('/library', requirePortal, portal.library);
router.get('/transport', requirePortal, portal.transport);

module.exports = router;
