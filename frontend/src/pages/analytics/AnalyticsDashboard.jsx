import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Tab,
  Tabs,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Chip,
  Paper,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  LocalHospital,
  Medication,
  Hotel,
  AttachMoney,
  Group,
  Warning,
  CheckCircle,
  Refresh,
  Download,
  Analytics,
  Psychology,
  Security
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { api } from '../../services/api';
import Layout from '../../components/Layout';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState('HOSP001');
  const [predictions, setPredictions] = useState({
    demand: null,
    drugUsage: null,
    occupancy: null,
    revenue: null,
    staffing: null
  });
  const [aiTriage, setAiTriage] = useState(null);
  const [fraudDetection, setFraudDetection] = useState(null);
  const [crossHospitalData, setCrossHospitalData] = useState([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [activeTab, selectedHospital]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 0: // Predictive Analytics
          await fetchPredictions();
          break;
        case 1: // AI/ML Use Cases
          await fetchAIMLData();
          break;
        case 2: // Cross-Hospital Analytics
          await fetchCrossHospitalAnalytics();
          break;
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
    setLoading(false);
  };

  const fetchPredictions = async () => {
    try {
      // Mock API calls - replace with actual API
      const mockDemand = {
        predictions: [
          { date: '2024-01-16', predictedPatients: 145, confidence: 0.82 },
          { date: '2024-01-17', predictedPatients: 152, confidence: 0.85 },
          { date: '2024-01-18', predictedPatients: 148, confidence: 0.83 },
          { date: '2024-01-19', predictedPatients: 155, confidence: 0.86 },
          { date: '2024-01-20', predictedPatients: 142, confidence: 0.81 },
          { date: '2024-01-21', predictedPatients: 138, confidence: 0.80 },
          { date: '2024-01-22', predictedPatients: 150, confidence: 0.84 }
        ]
      };

      const mockOccupancy = {
        currentOccupancy: 78.5,
        predictions: [
          { hour: '+1h', predictedOccupancy: 80, alert: 'MODERATE' },
          { hour: '+2h', predictedOccupancy: 82, alert: 'MODERATE' },
          { hour: '+3h', predictedOccupancy: 85, alert: 'MODERATE' },
          { hour: '+4h', predictedOccupancy: 88, alert: 'MODERATE' },
          { hour: '+6h', predictedOccupancy: 91, alert: 'HIGH_OCCUPANCY' },
          { hour: '+8h', predictedOccupancy: 89, alert: 'MODERATE' }
        ]
      };

      const mockRevenue = {
        monthlyProjection: 45000000,
        predictions: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          predictedRevenue: 1500000 + Math.random() * 300000,
          confidence: 0.75 + Math.random() * 0.15
        }))
      };

      const mockStaffing = {
        predictions: [
          { date: '2024-01-16', staffingRequirements: { nurses: 45, doctors: 12, total: 70 } },
          { date: '2024-01-17', staffingRequirements: { nurses: 48, doctors: 13, total: 75 } },
          { date: '2024-01-18', staffingRequirements: { nurses: 46, doctors: 12, total: 71 } },
          { date: '2024-01-19', staffingRequirements: { nurses: 50, doctors: 14, total: 78 } },
          { date: '2024-01-20', staffingRequirements: { nurses: 44, doctors: 11, total: 68 } }
        ]
      };

      const mockDrugUsage = {
        drugName: 'Paracetamol',
        predictions: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          predictedUsage: 500 + Math.random() * 200,
          reorderPoint: 3500
        }))
      };

      setPredictions({
        demand: mockDemand,
        drugUsage: mockDrugUsage,
        occupancy: mockOccupancy,
        revenue: mockRevenue,
        staffing: mockStaffing
      });
    } catch (error) {
      console.error('Error fetching predictions:', error);
    }
  };

  const fetchAIMLData = async () => {
    try {
      // Mock AI triage data
      setAiTriage({
        recentCases: [
          { id: 1, symptoms: 'Chest pain, shortness of breath', category: 'EMERGENCY', confidence: 0.92 },
          { id: 2, symptoms: 'Headache, mild fever', category: 'NON_URGENT', confidence: 0.78 },
          { id: 3, symptoms: 'Severe abdominal pain', category: 'URGENT', confidence: 0.85 },
          { id: 4, symptoms: 'Cough, cold symptoms', category: 'ROUTINE', confidence: 0.73 }
        ],
        categoryDistribution: [
          { name: 'EMERGENCY', value: 12 },
          { name: 'URGENT', value: 28 },
          { name: 'LESS_URGENT', value: 45 },
          { name: 'NON_URGENT', value: 62 },
          { name: 'ROUTINE', value: 38 }
        ]
      });

      // Mock fraud detection data
      setFraudDetection({
        summary: {
          totalAnalyzed: 1250,
          anomaliesDetected: 23,
          highRisk: 5,
          moderateRisk: 8,
          lowRisk: 10
        },
        recentAnomalies: [
          { billId: 'BILL-001', amount: 2500000, fraudScore: 78, flags: ['UNUSUALLY_HIGH_AMOUNT'] },
          { billId: 'BILL-002', amount: 450000, fraudScore: 65, flags: ['POTENTIAL_DUPLICATE'] },
          { billId: 'BILL-003', amount: 1200000, fraudScore: 72, flags: ['EXCESSIVE_SERVICES'] }
        ]
      });
    } catch (error) {
      console.error('Error fetching AI/ML data:', error);
    }
  };

  const fetchCrossHospitalAnalytics = async () => {
    try {
      // Mock cross-hospital data
      setCrossHospitalData([
        { 
          hospital: 'Lagos General', 
          occupancy: 82, 
          revenue: 15000000, 
          patients: 450,
          satisfaction: 4.2 
        },
        { 
          hospital: 'Abuja Central', 
          occupancy: 78, 
          revenue: 12000000, 
          patients: 380,
          satisfaction: 4.5 
        },
        { 
          hospital: 'Port Harcourt Specialist', 
          occupancy: 85, 
          revenue: 18000000, 
          patients: 520,
          satisfaction: 4.1 
        },
        { 
          hospital: 'Kano Teaching', 
          occupancy: 75, 
          revenue: 10000000, 
          patients: 320,
          satisfaction: 4.3 
        }
      ]);
    } catch (error) {
      console.error('Error fetching cross-hospital analytics:', error);
    }
  };

  const renderPredictiveAnalytics = () => (
    <Grid container spacing={3}>
      {/* Patient Demand Forecast */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <LocalHospital sx={{ mr: 1, verticalAlign: 'middle' }} />
              Patient Demand Forecast (7 Days)
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={predictions.demand?.predictions || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="predictedPatients" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Average Confidence: {
                  predictions.demand?.predictions
                    ? (predictions.demand.predictions.reduce((sum, p) => sum + p.confidence, 0) / 
                       predictions.demand.predictions.length * 100).toFixed(1)
                    : 0
                }%
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Bed Occupancy Prediction */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <Hotel sx={{ mr: 1, verticalAlign: 'middle' }} />
              Bed Occupancy Forecast (24 Hours)
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h4">
                {predictions.occupancy?.currentOccupancy?.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Current Occupancy
              </Typography>
            </Box>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={predictions.occupancy?.predictions || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <ChartTooltip />
                <Bar dataKey="predictedOccupancy" fill="#22c55e">
                  {predictions.occupancy?.predictions?.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.alert === 'HIGH_OCCUPANCY' ? '#ef4444' : 
                            entry.alert === 'MODERATE' ? '#f59e0b' : '#22c55e'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Revenue Forecast */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <AttachMoney sx={{ mr: 1, verticalAlign: 'middle' }} />
              Revenue Forecast (30 Days)
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h5">
                ₦{(predictions.revenue?.monthlyProjection / 1000000).toFixed(2)}M
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Monthly Projection
              </Typography>
            </Box>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={predictions.revenue?.predictions?.slice(0, 7) || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip />
                <Area 
                  type="monotone" 
                  dataKey="predictedRevenue" 
                  stroke="#8b5cf6" 
                  fill="#8b5cf6" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Staffing Needs */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <Group sx={{ mr: 1, verticalAlign: 'middle' }} />
              Staffing Requirements (5 Days)
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={predictions.staffing?.predictions || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip />
                <Legend />
                <Bar dataKey="staffingRequirements.nurses" stackId="a" fill="#3b82f6" name="Nurses" />
                <Bar dataKey="staffingRequirements.doctors" stackId="a" fill="#22c55e" name="Doctors" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Drug Usage Prediction */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <Medication sx={{ mr: 1, verticalAlign: 'middle' }} />
              Drug Usage Prediction - {predictions.drugUsage?.drugName || 'Paracetamol'} (30 Days)
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={predictions.drugUsage?.predictions?.slice(0, 10) || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="predictedUsage" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="Predicted Usage"
                />
                <Line 
                  type="monotone" 
                  dataKey="reorderPoint" 
                  stroke="#ef4444" 
                  strokeDasharray="5 5"
                  name="Reorder Point"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderAIMLUseCases = () => (
    <Grid container spacing={3}>
      {/* AI Triage */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <Psychology sx={{ mr: 1, verticalAlign: 'middle' }} />
              AI Triage System
            </Typography>
            
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Category Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={aiTriage?.categoryDistribution || []}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                  label
                >
                  {aiTriage?.categoryDistribution?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip />
              </PieChart>
            </ResponsiveContainer>

            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Recent Triage Cases
            </Typography>
            {aiTriage?.recentCases?.map((case_) => (
              <Paper key={case_.id} sx={{ p: 1, mb: 1 }}>
                <Typography variant="body2">{case_.symptoms}</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Chip 
                    label={case_.category} 
                    size="small"
                    color={case_.category === 'EMERGENCY' ? 'error' : 
                           case_.category === 'URGENT' ? 'warning' : 'default'}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Confidence: {(case_.confidence * 100).toFixed(0)}%
                  </Typography>
                </Box>
              </Paper>
            ))}
          </CardContent>
        </Card>
      </Grid>

      {/* Fraud Detection */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <Security sx={{ mr: 1, verticalAlign: 'middle' }} />
              Billing Fraud Detection
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light', color: 'white' }}>
                  <Typography variant="h4">{fraudDetection?.summary?.highRisk || 0}</Typography>
                  <Typography variant="body2">High Risk</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', color: 'white' }}>
                  <Typography variant="h4">{fraudDetection?.summary?.moderateRisk || 0}</Typography>
                  <Typography variant="body2">Moderate Risk</Typography>
                </Paper>
              </Grid>
            </Grid>

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Recent Anomalies
            </Typography>
            {fraudDetection?.recentAnomalies?.map((anomaly) => (
              <Paper key={anomaly.billId} sx={{ p: 1, mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">{anomaly.billId}</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    ₦{(anomaly.amount / 1000).toFixed(0)}k
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                  {anomaly.flags.map((flag) => (
                    <Chip key={flag} label={flag} size="small" color="error" />
                  ))}
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={anomaly.fraudScore} 
                  sx={{ mt: 1 }}
                  color={anomaly.fraudScore > 70 ? 'error' : 'warning'}
                />
              </Paper>
            ))}

            <Alert severity="info" sx={{ mt: 2 }}>
              Total Analyzed: {fraudDetection?.summary?.totalAnalyzed || 0} bills
            </Alert>
          </CardContent>
        </Card>
      </Grid>

      {/* Readmission Risk */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Patient Risk Scoring
            </Typography>
            <Grid container spacing={2}>
              {[
                { patient: 'PAT-001', name: 'Adebayo O.', risk: 75, category: 'HIGH' },
                { patient: 'PAT-002', name: 'Fatima I.', risk: 45, category: 'MODERATE' },
                { patient: 'PAT-003', name: 'Chidi O.', risk: 25, category: 'LOW' },
                { patient: 'PAT-004', name: 'Aisha B.', risk: 82, category: 'HIGH' }
              ].map((patient) => (
                <Grid item xs={12} sm={6} md={3} key={patient.patient}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2">{patient.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {patient.patient}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={patient.risk}
                        color={patient.category === 'HIGH' ? 'error' : 
                               patient.category === 'MODERATE' ? 'warning' : 'success'}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Chip 
                          label={patient.category}
                          size="small"
                          color={patient.category === 'HIGH' ? 'error' : 
                                 patient.category === 'MODERATE' ? 'warning' : 'success'}
                        />
                        <Typography variant="caption">
                          {patient.risk}% Risk
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderCrossHospitalAnalytics = () => (
    <Grid container spacing={3}>
      {/* Performance Comparison */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Hospital Performance Comparison
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={crossHospitalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hospital" />
                <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                <YAxis yAxisId="right" orientation="right" stroke="#22c55e" />
                <ChartTooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="occupancy" fill="#3b82f6" name="Occupancy %" />
                <Bar yAxisId="right" dataKey="patients" fill="#22c55e" name="Patients" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Revenue Comparison */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Revenue Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={crossHospitalData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                  nameKey="hospital"
                  label
                >
                  {crossHospitalData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Satisfaction Scores */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Patient Satisfaction Scores
            </Typography>
            {crossHospitalData.map((hospital) => (
              <Box key={hospital.hospital} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">{hospital.hospital}</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {hospital.satisfaction}/5.0
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={hospital.satisfaction * 20}
                  sx={{ mt: 0.5 }}
                  color={hospital.satisfaction >= 4.5 ? 'success' : 
                         hospital.satisfaction >= 4 ? 'primary' : 'warning'}
                />
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>

      {/* Key Metrics Summary */}
      <Grid item xs={12}>
        <Grid container spacing={2}>
          {[
            { 
              label: 'Total Patients', 
              value: crossHospitalData.reduce((sum, h) => sum + h.patients, 0),
              icon: <LocalHospital />,
              color: 'primary.main'
            },
            { 
              label: 'Total Revenue', 
              value: `₦${(crossHospitalData.reduce((sum, h) => sum + h.revenue, 0) / 1000000).toFixed(1)}M`,
              icon: <AttachMoney />,
              color: 'success.main'
            },
            { 
              label: 'Avg Occupancy', 
              value: `${(crossHospitalData.reduce((sum, h) => sum + h.occupancy, 0) / crossHospitalData.length).toFixed(1)}%`,
              icon: <Hotel />,
              color: 'warning.main'
            },
            { 
              label: 'Avg Satisfaction', 
              value: (crossHospitalData.reduce((sum, h) => sum + h.satisfaction, 0) / crossHospitalData.length).toFixed(1),
              icon: <CheckCircle />,
              color: 'info.main'
            }
          ].map((metric) => (
            <Grid item xs={12} sm={6} md={3} key={metric.label}>
              <Paper sx={{ p: 2, bgcolor: metric.color, color: 'white' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {metric.icon}
                  <Typography variant="subtitle2" sx={{ ml: 1 }}>
                    {metric.label}
                  </Typography>
                </Box>
                <Typography variant="h4">{metric.value}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Grid>
    </Grid>
  );

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">
            <Analytics sx={{ mr: 1, verticalAlign: 'middle' }} />
            Data & Analytics
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Hospital</InputLabel>
              <Select
                value={selectedHospital}
                onChange={(e) => setSelectedHospital(e.target.value)}
                label="Hospital"
              >
                <MenuItem value="HOSP001">Lagos General Hospital</MenuItem>
                <MenuItem value="HOSP002">Abuja Central Medical</MenuItem>
                <MenuItem value="HOSP003">Port Harcourt Specialist</MenuItem>
                <MenuItem value="HOSP004">Kano Teaching Hospital</MenuItem>
              </Select>
            </FormControl>
            
            <Tooltip title="Refresh Data">
              <IconButton onClick={fetchAnalyticsData} color="primary">
                <Refresh />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Export Data">
              <IconButton color="primary">
                <Download />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
            <Tab label="Predictive Analytics" />
            <Tab label="AI/ML Use Cases" />
            <Tab label="Cross-Hospital Analytics" />
          </Tabs>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {activeTab === 0 && renderPredictiveAnalytics()}
            {activeTab === 1 && renderAIMLUseCases()}
            {activeTab === 2 && renderCrossHospitalAnalytics()}
          </>
        )}
      </Box>
    </Layout>
  );
}

export default AnalyticsDashboard;
