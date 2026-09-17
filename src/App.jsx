import BharatiTwin from "./twin/Bharati3D";

function App() {

  // =========================================================
  // SELECTED DIGITAL TWIN ASSET
  // =========================================================

  const [selectedAsset, setSelectedAsset] = useState(null);


  return (
    <div className="app-shell">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="top-header">

        <div className="brand-area">

          <div className="brand-mark">
            <Layers3 size={21} strokeWidth={1.8} />
          </div>

          <div className="brand-text">

            <div className="brand-title">
              ANTARASETU
            </div>

            <div className="brand-subtitle">
              Antarctic Station Digital Twin &amp; Operations Platform
            </div>

          </div>

        </div>


        <div className="header-right">

          <button className="station-selector">
            <span className="live-dot" />
            <span>BHARATI</span>
            <ChevronDown size={15} />
          </button>


          <div className="header-status">
            <span className="status-dot" />
            SYSTEM SYNCED
          </div>


          <button className="header-icon-button">
            <Bell size={17} />
          </button>


          <button className="header-icon-button">
            <Settings size={17} />
          </button>

        </div>

      </header>



      {/* =====================================================
          DASHBOARD BODY
      ===================================================== */}

      <div className="dashboard-body">


        {/* ===================================================
            SIDEBAR
        =================================================== */}

        <aside className="sidebar">


          <div className="sidebar-section">

            <div className="sidebar-section-title">
              COMMAND
            </div>


            <button className="sidebar-item active">
              <Home size={17} />
              <span>Overview</span>
            </button>


            <button className="sidebar-item">
              <Map size={17} />
              <span>Stations</span>
            </button>

          </div>



          <div className="sidebar-section">

            <div className="sidebar-section-title">
              MONITORING
            </div>


            <button className="sidebar-item">
              <CloudSnow size={17} />
              <span>Environment</span>
            </button>


            <button className="sidebar-item">
              <Zap size={17} />
              <span>Energy</span>
            </button>


            <button className="sidebar-item">
              <Database size={17} />
              <span>Resources</span>
            </button>

          </div>



          <div className="sidebar-section">

            <div className="sidebar-section-title">
              OPERATIONS
            </div>


            <button className="sidebar-item">
              <Truck size={17} />
              <span>Logistics</span>
            </button>


            <button className="sidebar-item">

              <ShieldAlert size={17} />

              <span>
                Alerts
              </span>

              <span className="sidebar-count">
                2
              </span>

            </button>


            <button className="sidebar-item">
              <CircleGauge size={17} />
              <span>Action Center</span>
            </button>

          </div>



          <div className="sidebar-section">

            <div className="sidebar-section-title">
              COMMUNICATION
            </div>


            <button className="sidebar-item">
              <Radio size={17} />
              <span>Station Link</span>
            </button>


            <button className="sidebar-item">
              <Activity size={17} />
              <span>Data Sync</span>
            </button>

          </div>



          {/* SIDEBAR STATION CARD */}

          <div className="sidebar-bottom">

            <div className="station-mini-card">

              <div className="station-mini-title">
                BHARATI STATION
              </div>


              <div className="station-mini-meta">

                <span className="status-dot" />

                OPERATIONAL

              </div>


              <div className="station-mini-info">

                <span>
                  <Users size={13} />
                  47 personnel
                </span>


                <span>
                  <Radio size={13} />
                  98% link
                </span>

              </div>

            </div>

          </div>

        </aside>



        {/* ===================================================
            MAIN CONTENT
        =================================================== */}

        <main className="main-content">


          {/* =================================================
              PAGE HEADER
          ================================================= */}

          <div className="content-topbar">

            <div>

              <div className="page-kicker">
                COMMAND OVERVIEW
              </div>


              <h1 className="page-title">
                Antarctic Station Digital Twin
              </h1>


              <p className="page-description">
                Unified operational view of station environment,
                energy, resources and infrastructure.
              </p>

            </div>



            <div className="view-actions">

              <button className="view-button active">
                <Box size={16} />
                3D TWIN
              </button>


              <button className="view-button">
                <Map size={16} />
                MAP
              </button>

            </div>

          </div>



          {/* =================================================
              MAIN GRID
          ================================================= */}

          <div className="main-grid">


            {/* =================================================
                DIGITAL TWIN
            ================================================= */}

            <section className="twin-section">


              <div className="twin-header">

                <div className="twin-header-left">

                  <div className="twin-title">
                    BHARATI DIGITAL TWIN
                  </div>


                  <span className="twin-badge">
                    EXTERIOR · CONCEPTUAL MODEL
                  </span>

                </div>



                <div className="twin-header-right">

                  <span className="twin-status">

                    <span className="status-dot" />

                    MODEL ONLINE

                  </span>

                </div>

              </div>



              {/* =================================================
                  3D MODEL
              ================================================= */}

              <div className="twin-canvas">

                <BharatiTwin
                  onSelectAsset={setSelectedAsset}
                />


                <div className="twin-label">
                  DIGITAL TWIN
                </div>


                <div className="twin-hint">
                  Click an asset to inspect · Drag to rotate ·
                  Scroll to zoom · Right drag to pan
                </div>

              </div>

            </section>



            {/* =================================================
                RIGHT INFORMATION PANEL
            ================================================= */}

            <aside className="station-panel">


              {/* =================================================
                  DEFAULT STATION VIEW
              ================================================= */}

              {!selectedAsset && (

                <>

                  <div className="panel-header">

                    <div className="panel-kicker">
                      STATION
                    </div>


                    <div className="panel-title">
                      Bharati
                    </div>


                    <div className="panel-location">
                      Larsemann Hills · East Antarctica
                    </div>

                  </div>



                  <div className="panel-section">

                    <div className="panel-section-title">
                      OPERATING STATUS
                    </div>


                    <div className="panel-row">

                      <span className="panel-row-label">
                        Station
                      </span>


                      <span className="status-pill green">
                        OPERATIONAL
                      </span>

                    </div>


                    <div className="panel-row">

                      <span className="panel-row-label">
                        Personnel
                      </span>


                      <span className="panel-row-value">
                        47
                      </span>

                    </div>


                    <div className="panel-row">

                      <span className="panel-row-label">
                        Communication
                      </span>


                      <span className="status-pill green">
                        98%
                      </span>

                    </div>

                  </div>



                  <div className="panel-section">

                    <div className="panel-section-title">
                      INFRASTRUCTURE
                    </div>


                    <div className="panel-row">

                      <span className="panel-row-label">
                        Power System
                      </span>


                      <span className="status-pill orange">
                        WARNING
                      </span>

                    </div>


                    <div className="panel-row">

                      <span className="panel-row-label">
                        Solar Array
                      </span>


                      <span className="status-pill green">
                        ONLINE
                      </span>

                    </div>


                    <div className="panel-row">

                      <span className="panel-row-label">
                        Generator
                      </span>


                      <span className="status-pill green">
                        ONLINE
                      </span>

                    </div>

                  </div>



                  <div className="panel-section">

                    <div className="panel-section-title">
                      DATA STATUS
                    </div>


                    <div className="data-source-card">

                      <div className="data-source-top">

                        <Database size={15} />

                        <span>
                          PROTOTYPE DATA
                        </span>

                      </div>


                      <p>
                        Dashboard telemetry is currently
                        synthetic and modeled for prototype
                        demonstration.
                      </p>

                    </div>

                  </div>

                </>

              )}



              {/* =================================================
                  SELECTED ASSET VIEW
              ================================================= */}

              {selectedAsset && (

                <>

                  <div className="panel-header">

                    <div className="panel-kicker">
                      DIGITAL TWIN ASSET
                    </div>


                    <div className="panel-title">
                      {selectedAsset.name}
                    </div>


                    <div className="panel-location">
                      Bharati Station · 3D Model
                    </div>

                  </div>



                  <div className="panel-section">

                    <div className="panel-section-title">
                      ASSET STATUS
                    </div>


                    <div className="panel-row">

                      <span className="panel-row-label">
                        Status
                      </span>


                      <span
                        className={
                          selectedAsset.status === "WARNING"
                            ? "status-pill orange"
                            : "status-pill green"
                        }
                      >
                        {selectedAsset.status}
                      </span>

                    </div>


                    <div className="panel-row">

                      <span className="panel-row-label">
                        Type
                      </span>


                      <span className="panel-row-value">
                        {selectedAsset.type}
                      </span>

                    </div>


                    <div className="panel-row">

                      <span className="panel-row-label">
                        Asset ID
                      </span>


                      <span className="panel-row-value">
                        {selectedAsset.id}
                      </span>

                    </div>

                  </div>



                  <div className="panel-section">

                    <div className="panel-section-title">
                      CURRENT VALUE
                    </div>


                    <div className="asset-detail-value">
                      {selectedAsset.value}
                    </div>


                    <div className="asset-detail-source">
                      SOURCE · {selectedAsset.source}
                    </div>

                  </div>



                  <div className="panel-section">

                    <div className="panel-section-title">
                      DATA PROVENANCE
                    </div>


                    <div className="data-source-card">

                      <div className="data-source-top">

                        <Database size={15} />

                        <span>
                          {selectedAsset.source}
                        </span>

                      </div>


                      <p>

                        This asset is currently represented
                        using prototype digital-twin data.
                        It is not being presented as live
                        station telemetry.

                      </p>

                    </div>

                  </div>



                  <div className="panel-section">

                    <button
                      className="clear-selection-button"
                      onClick={() => setSelectedAsset(null)}
                    >
                      CLEAR ASSET SELECTION
                    </button>

                  </div>

                </>

              )}

            </aside>

          </div>



          {/* =================================================
              TELEMETRY
          ================================================= */}

          <section className="telemetry-section">

            <div className="telemetry-grid">


              <div className="telemetry-card">

                <div className="telemetry-label">
                  TEMPERATURE
                </div>

                <div className="telemetry-value">
                  -18.4
                  <span className="telemetry-unit">
                    °C
                  </span>
                </div>

                <div className="telemetry-source">
                  ENVIRONMENT · SYNTHETIC
                </div>

              </div>



              <div className="telemetry-card">

                <div className="telemetry-label">
                  WIND SPEED
                </div>

                <div className="telemetry-value">
                  24
                  <span className="telemetry-unit">
                    km/h
                  </span>
                </div>

                <div className="telemetry-source">
                  WEATHER · SYNTHETIC
                </div>

              </div>



              <div className="telemetry-card">

                <div className="telemetry-label">
                  POWER LOAD
                </div>

                <div className="telemetry-value">
                  68
                  <span className="telemetry-unit">
                    %
                  </span>
                </div>

                <div className="telemetry-source">
                  ENERGY · SYNTHETIC
                </div>

              </div>



              <div className="telemetry-card">

                <div className="telemetry-label">
                  FUEL LEVEL
                </div>

                <div className="telemetry-value">
                  82
                  <span className="telemetry-unit">
                    %
                  </span>
                </div>

                <div className="telemetry-source">
                  RESOURCE · SYNTHETIC
                </div>

              </div>



              <div className="telemetry-card">

                <div className="telemetry-label">
                  AUTONOMY
                </div>

                <div className="telemetry-value">
                  41
                  <span className="telemetry-unit">
                    days
                  </span>
                </div>

                <div className="telemetry-source">
                  DERIVED · MODELED
                </div>

              </div>



              <div className="telemetry-card">

                <div className="telemetry-label">
                  COMMUNICATION
                </div>

                <div className="telemetry-value">
                  98
                  <span className="telemetry-unit">
                    %
                  </span>
                </div>

                <div className="telemetry-source">
                  LINK HEALTH · SYNTHETIC
                </div>

              </div>


            </div>

          </section>

        </main>

      </div>

    </div>
  );
}


export default App;