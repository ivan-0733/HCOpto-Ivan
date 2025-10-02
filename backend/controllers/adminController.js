const adminService = require('../services/adminService');
const { catchAsync } = require('../utils/errorHandler');

const adminController = {
  /**
   * Obtener todas las historias clínicas
   */
  obtenerTodasHistorias: catchAsync(async (req, res) => {
    const historias = await adminService.obtenerTodasHistorias();

    res.status(200).json({
      status: 'success',
      data: { historias }
    });
  }),

  /**
   * Obtener estadísticas globales
   */
  obtenerEstadisticasGlobales: catchAsync(async (req, res) => {
    const estadisticas = await adminService.obtenerEstadisticasGlobales();

    res.status(200).json({
      status: 'success',
      data: { estadisticas }
    });
  }),

  /**
   * Obtener todas las materias
   */
  obtenerTodasMaterias: catchAsync(async (req, res) => {
    const materias = await adminService.obtenerTodasMaterias();

    res.status(200).json({
      status: 'success',
      data: { materias }
    });
  }),

  /**
   * Actualizar estado de historia
   */
  actualizarEstadoHistoria: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;

    const resultado = await adminService.actualizarEstadoHistoria(id, estado);

    res.status(200).json({
      status: 'success',
      data: resultado
    });
  }),

  /**
   * Archivar/Desarchivar historia
   */
  toggleArchivarHistoria: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { archivar } = req.body;

    const resultado = await adminService.toggleArchivarHistoria(id, archivar);

    res.status(200).json({
      status: 'success',
      data: resultado
    });
  }),

  /**
   * Eliminar historia
   */
  eliminarHistoria: catchAsync(async (req, res) => {
    const { id } = req.params;

    const resultado = await adminService.eliminarHistoria(id);

    res.status(200).json({
      status: 'success',
      data: resultado
    });
  }),

  /**
   * Obtener comentarios de una historia
   */
  obtenerComentarios: catchAsync(async (req, res) => {
    const { id } = req.params;

    const comentarios = await adminService.obtenerComentariosHistoria(id);

    res.status(200).json({
      status: 'success',
      data: { comentarios }
    });
  }),

  /**
   * Agregar comentario
   */
  agregarComentario: catchAsync(async (req, res) => {
    const { id } = req.params;
    const { comentario } = req.body;
    const usuarioId = req.usuario.UsuarioID;

    const nuevoComentario = await adminService.agregarComentario(id, usuarioId, comentario);

    res.status(201).json({
      status: 'success',
      data: { comentario: nuevoComentario }
    });
  }),

  /**
   * Obtener perfil del admin
   */
  obtenerPerfil: catchAsync(async (req, res) => {
    const usuarioId = req.usuario.UsuarioID;

    const perfil = await adminService.obtenerPerfilAdmin(usuarioId);
    const estadisticas = await adminService.obtenerEstadisticasGlobales();

    res.status(200).json({
      status: 'success',
      data: {
        perfil,
        estadisticas
      }
    });
  })
};

module.exports = adminController;