import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaClock, FaMapMarkerAlt, FaTicketAlt, FaCouch, FaCalendarAlt, FaSync } from 'react-icons/fa';
import sessionsService from '../../api/sessions';
import useAlert from '../../hooks/useAlert';
import useAuth from '../../hooks/useAuth';
import './styles.css';

const SeatSelection = () => {
  const { id } = useParams(); // session id
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resetLoading, setResetLoading] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const { showAlert, error } = useAlert();
  const { user } = useAuth();

  useEffect(() => {
    const fetchSession = async () => {
      try {
        setLoading(true);
        console.log(`Fetching session details for ID: ${id}`);
        const response = await sessionsService.getSessionById(id);
        console.log('Session detail response:', response);

        if (response.success && response.data) {
          let sessionData = response.data;
          
          if (!sessionData.movie) {
            throw new Error('Movie data is missing in session response');
          }
          
          if (!sessionData.theater) {
            throw new Error('Theater data is missing in session response');
          }
           if (!Array.isArray(sessionData.seats)) {
            sessionData.seats = [];
            console.warn('Session seats property is not an array, using empty array');
          } else {
            console.log(`Carregados ${sessionData.seats.length} assentos para a sessão:`, 
              sessionData.seats.reduce((acc, seat) => {
                acc[seat.status] = (acc[seat.status] || 0) + 1;
                return acc;
              }, {})
            );
          }
          
          setSession(sessionData);
        } else {
          error('Erro ao carregar detalhes da sessão.');
          console.error('Session data not found in response:', response);
          setTimeout(() => navigate('/'), 3000);
        }
      } catch (err) {
        error('Erro ao carregar informações. Tente novamente mais tarde.');
        console.error('Error fetching session details:', err);
        setTimeout(() => navigate('/'), 3000);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [id, error, navigate]);
  const handleSeatSelection = (seat) => {
    if (seat.status !== 'available') {
      console.log(`Assento ${seat.row}-${seat.number} não disponível (status: ${seat.status})`);
      return;
    }

    const seatIndex = selectedSeats.findIndex(
      (selected) => selected.row === seat.row && selected.number === seat.number
    );

    if (seatIndex === -1) {
      console.log(`Adicionando assento ${seat.row}-${seat.number} à seleção`);
      setSelectedSeats([...selectedSeats, seat]);
    } else {
      console.log(`Removendo assento ${seat.row}-${seat.number} da seleção`);
      const newSelected = [...selectedSeats];
      newSelected.splice(seatIndex, 1);
      setSelectedSeats(newSelected);
    }
  };
  const getSeatStatus = (seat) => {
    const isSelected = selectedSeats.some(
      (selected) => selected.row === seat.row && selected.number === seat.number
    );

    if (isSelected) return 'selected';
    
    return seat.status || 'available'; 
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('pt-BR', options);
  };

  const formatTime = (dateString) => {
    const options = { hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleTimeString('pt-BR', options);
  };

  const calculateTotal = () => {
    if (!session) return 0;
    return selectedSeats.length * session.fullPrice;
  };  
  const handleResetSeats = async () => {
    try {
      setResetLoading(true);
      
      setSelectedSeats([]);
      
      if (!user || user.role !== 'admin') {
        const updatedSession = {
          ...session,
          seats: session.seats.map(seat => ({
            ...seat,
            status: 'available' 
          }))
        };
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setSession(updatedSession);
        showAlert('Assentos atualizados localmente para demonstração!', 'success');
      } else {
        console.log('Resetting seats via API for session:', id);
        try {
          const response = await sessionsService.resetSessionSeats(id);
          
          if (response.success) {
            setSession(response.data);
            showAlert('Todos os assentos foram resetados com sucesso!', 'success');
          } else {
            throw new Error(response.message || 'Failed to reset seats');
          }
        } catch (apiErr) {
          console.error('API error resetting seats:', apiErr);
          error('Erro ao resetar assentos via API. Verifique se você tem permissões de admin.');
          throw apiErr; 
        }
      }
    } catch (err) {
      console.error('Error in reset seats function:', err);
    } finally {
      setResetLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="seat-selection-container loading-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Carregando detalhes da sessão...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="seat-selection-container error-container">
        <div className="error-message">
          <h2>Sessão não encontrada</h2>
          <p>Não foi possível encontrar os detalhes da sessão solicitada.</p>
          <Link to="/" className="btn btn-primary">Voltar para a página inicial</Link>
        </div>
      </div>
    );
  }

  if (!Array.isArray(session.seats)) {
    session.seats = [];
    console.warn('Session seats property is not an array, using empty array');
  }
  
  const seatsByRow = session.seats.reduce((acc, seat) => {
    if (!seat || !seat.row) return acc; 
    
    if (!acc[seat.row]) {
      acc[seat.row] = [];
    }
    acc[seat.row].push(seat);
    return acc;
  }, {});

  return (
    <div className="seat-selection-page">
      <div className="seat-selection-container">        <div className="breadcrumb">
          <div className="breadcrumb-links">
            {session.movie && session.movie._id ? (
              <Link to={`/movies/${session.movie._id}`} className="back-link">
                <FaArrowLeft /> Voltar para detalhes do filme
              </Link>
            ) : (
              <Link to="/" className="back-link">
                <FaArrowLeft /> Voltar para página inicial
              </Link>
            )}
            {user && user.role === 'admin' && (
              <span className="admin-badge">Modo Admin</span>
            )}
          </div><div className="admin-actions">
            <button 
              onClick={handleResetSeats}
              disabled={resetLoading}
              className="btn btn-primary btn-sm reset-seats-btn"
              title={user && user.role === 'admin' ? "Resetar todos os assentos para disponível no banco de dados" : "Torna todos os assentos disponíveis (apenas localmente)"}
            >
              {resetLoading ? 'Processando...' : <><FaSync /> {user && user.role === 'admin' ? 'Resetar Assentos' : 'Liberar Assentos'}</>}
            </button>
          </div>
        </div>

        <div className="session-details">
          <h1>{session.movie.title}</h1>
          <div className="session-meta">
            <p><FaCalendarAlt /> {formatDate(session.datetime)}</p>
            <p><FaClock /> {formatTime(session.datetime)}</p>
            <p><FaMapMarkerAlt /> {session.theater?.name} - {session.theater?.type}</p>
            <p><FaTicketAlt /> R$ {session.fullPrice.toFixed(2)}</p>
          </div>
        </div>

        <div className="seat-legend">
          <div className="legend-item">
            <div className="seat-icon available"></div>
            <span>Disponível</span>
          </div>
          <div className="legend-item">
            <div className="seat-icon selected"></div>
            <span>Selecionado</span>
          </div>
          <div className="legend-item">
            <div className="seat-icon reserved"></div>
            <span>Reservado</span>
          </div>
          <div className="legend-item">
            <div className="seat-icon occupied"></div>
            <span>Ocupado</span>
          </div>
        </div>

        <div className="screen">Tela</div>

        <div className="seats-container">
          {Object.entries(seatsByRow)
            .sort(([rowA], [rowB]) => rowA.localeCompare(rowB))
            .map(([row, seats]) => (
              <div key={row} className="seat-row">
                <div className="row-label">{row}</div>
                <div className="row-seats">
                  {seats
                    .sort((a, b) => a.number - b.number)
                    .map((seat) => (                       <button
                        key={`${seat.row}-${seat.number}`}
                        className={`seat ${getSeatStatus(seat)}`}
                        onClick={() => handleSeatSelection(seat)}
                        disabled={getSeatStatus(seat) !== 'available' && getSeatStatus(seat) !== 'selected'}
                        title={`Fileira ${seat.row}, Assento ${seat.number} - Status: ${getSeatStatus(seat)}`}
                      >
                        <FaCouch />
                        <span className="seat-number">{seat.number}</span>
                      </button>
                    ))}
                </div>
              </div>
            ))}
        </div>

        <div className="selection-summary">
          <div className="selected-seats">
            <h3>Assentos Selecionados:</h3>
            {selectedSeats.length === 0 ? (
              <p>Nenhum assento selecionado</p>
            ) : (
              <ul>
                {selectedSeats
                  .sort((a, b) => {
                    if (a.row !== b.row) return a.row.localeCompare(b.row);
                    return a.number - b.number;
                  })
                  .map((seat) => (
                    <li key={`${seat.row}-${seat.number}`}>
                      Fileira {seat.row}, Assento {seat.number}
                    </li>
                  ))}
              </ul>
            )}
          </div>

          <div className="price-summary">
            <div className="price-item">
              <span>Total:</span>
              <span className="price">R$ {calculateTotal().toFixed(2)}</span>
            </div>
          </div>          <div className="action-buttons">
            <button
              className="btn btn-primary checkout-button"
              disabled={selectedSeats.length === 0}
              onClick={() => {
                navigate('/checkout', {
                  state: {
                    session: session,
                    selectedSeats: selectedSeats.map(seat => ({
                      ...seat,
                      type: 'full' // Default all to full price for demo
                    }))
                  }
                });
              }}
            >
              Continuar para Pagamento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeatSelection;