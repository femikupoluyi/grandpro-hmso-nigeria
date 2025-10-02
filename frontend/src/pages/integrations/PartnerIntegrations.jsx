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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Divider,
  Paper
} from '@mui/material';
import {
  LocalHospital as HospitalIcon,
  LocalPharmacy as PharmacyIcon,
  VideoCall as VideoIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Assessment as AssessmentIcon,
  Send as SendIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { api } from '../../services/api';
import Layout from '../../components/Layout';

function PartnerIntegrations() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [insuranceData, setInsuranceData] = useState({
    providers: [],
    eligibilityChecks: [],
    claims: [],
    stats: {
      totalClaims: 0,
      approvedClaims: 0,
      pendingClaims: 0,
      totalAmount: 0
    }
  });
  const [pharmacyData, setPharmacyData] = useState({
    suppliers: [],
    orders: [],
    autoReorderRules: [],
    inventory: []
  });
  const [telemedicineData, setTelemedicineData] = useState({
    providers: [],
    consultations: [],
    activeSessions: 0,
    triageQueue: []
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [formData, setFormData] = useState({});
  const [testResults, setTestResults] = useState(null);

  useEffect(() => {
    fetchIntegrationData();
  }, [activeTab]);

  const fetchIntegrationData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 0: // Insurance
          await fetchInsuranceData();
          break;
        case 1: // Pharmacy
          await fetchPharmacyData();
          break;
        case 2: // Telemedicine
          await fetchTelemedicineData();
          break;
      }
    } catch (error) {
      console.error('Error fetching integration data:', error);
    }
    setLoading(false);
  };

  const fetchInsuranceData = async () => {
    try {
      // Mock data for demonstration
      setInsuranceData({
        providers: [
          { id: 'NHIS', name: 'National Health Insurance Scheme', status: 'active', type: 'government' },
          { id: 'HYGEIA', name: 'Hygeia HMO', status: 'active', type: 'private' },
          { id: 'RELIANCE', name: 'Reliance HMO', status: 'active', type: 'private' },
          { id: 'AXA', name: 'AXA Mansard Health', status: 'inactive', type: 'private' }
        ],
        eligibilityChecks: [
          { id: 1, patient: 'Adebayo Ogundimu', provider: 'NHIS', status: 'eligible', coverage: 80 },
          { id: 2, patient: 'Fatima Ibrahim', provider: 'HYGEIA', status: 'eligible', coverage: 90 },
          { id: 3, patient: 'Chidi Okafor', provider: 'RELIANCE', status: 'not_eligible', coverage: 0 }
        ],
        claims: [
          { id: 'CLM-001', patient: 'Adebayo Ogundimu', amount: 45000, status: 'approved' },
          { id: 'CLM-002', patient: 'Fatima Ibrahim', amount: 120000, status: 'pending' },
          { id: 'CLM-003', patient: 'Emeka Nwankwo', amount: 75000, status: 'approved' }
        ],
        stats: {
          totalClaims: 47,
          approvedClaims: 35,
          pendingClaims: 8,
          totalAmount: 3250000
        }
      });
    } catch (error) {
      console.error('Error fetching insurance data:', error);
    }
  };

  const fetchPharmacyData = async () => {
    try {
      // Mock data for demonstration
      setPharmacyData({
        suppliers: [
          { id: 'EMZOR', name: 'Emzor Pharmaceuticals', status: 'connected', lastSync: new Date() },
          { id: 'FIDSON', name: 'Fidson Healthcare', status: 'connected', lastSync: new Date() },
          { id: 'MAY_BAKER', name: 'May & Baker Nigeria', status: 'connected', lastSync: new Date() },
          { id: 'HEALTHPLUS', name: 'HealthPlus Pharmacy', status: 'disconnected', lastSync: null }
        ],
        orders: [
          { id: 'ORD-001', supplier: 'EMZOR', items: 5, total: 250000, status: 'delivered' },
          { id: 'ORD-002', supplier: 'FIDSON', items: 3, total: 180000, status: 'shipped' },
          { id: 'ORD-003', supplier: 'MAY_BAKER', items: 8, total: 420000, status: 'processing' }
        ],
        autoReorderRules: [
          { drug: 'Paracetamol', reorderPoint: 100, reorderQty: 1000, supplier: 'EMZOR' },
          { drug: 'Amoxicillin', reorderPoint: 50, reorderQty: 500, supplier: 'FIDSON' },
          { drug: 'Insulin', reorderPoint: 20, reorderQty: 100, supplier: 'MAY_BAKER' }
        ],
        inventory: [
          { drug: 'Paracetamol', current: 450, status: 'ok' },
          { drug: 'Amoxicillin', current: 45, status: 'low' },
          { drug: 'Insulin', current: 15, status: 'critical' }
        ]
      });
    } catch (error) {
      console.error('Error fetching pharmacy data:', error);
    }
  };

  const fetchTelemedicineData = async () => {
    try {
      // Mock data for demonstration
      setTelemedicineData({
        providers: [
          { id: 'WELLAHEALTH', name: 'WellaHealth', status: 'active', features: ['Video', 'AI Triage'] },
          { id: 'MOBIHEALTH', name: 'Mobihealth', status: 'active', features: ['Video', 'E-Prescription'] },
          { id: 'DOCTOORA', name: 'Doctoora', status: 'inactive', features: ['Video'] }
        ],
        consultations: [
          { id: 'CONS-001', patient: 'Adebayo Ogundimu', doctor: 'Dr. Ibrahim', status: 'scheduled', time: '2:00 PM' },
          { id: 'CONS-002', patient: 'Fatima Ibrahim', doctor: 'Dr. Okafor', status: 'in_progress', time: '1:30 PM' },
          { id: 'CONS-003', patient: 'Chidi Okafor', doctor: 'Dr. Adeleke', status: 'completed', time: '11:00 AM' }
        ],
        activeSessions: 2,
        triageQueue: [
          { id: 'TRG-001', patient: 'Emeka Nwankwo', symptoms: 'Fever, Headache', category: 'URGENT' },
          { id: 'TRG-002', patient: 'Aisha Bello', symptoms: 'Cough, Cold', category: 'NON_URGENT' }
        ]
      });
    } catch (error) {
      console.error('Error fetching telemedicine data:', error);
    }
  };

  const handleTestIntegration = async (type, provider) => {
    setLoading(true);
    try {
      let result = {};
      
      switch (type) {
        case 'insurance':
          // Test insurance eligibility check
          result = await api.post('/insurance/verify-eligibility', {
            patientId: 'TEST-001',
            providerId: provider,
            insuranceNumber: 'TEST-12345',
            patientName: 'Test Patient'
          });
          break;
          
        case 'pharmacy':
          // Test drug availability
          result = await api.post('/pharmacy/check-availability', {
            drugName: 'Paracetamol',
            quantity: 100,
            hospitalId: 'HOSP001'
          });
          break;
          
        case 'telemedicine':
          // Test provider connection
          result = await api.get(`/telemedicine/providers`);
          break;
      }
      
      setTestResults({
        success: true,
        message: `${provider} integration test successful`,
        data: result.data
      });
    } catch (error) {
      setTestResults({
        success: false,
        message: `${provider} integration test failed: ${error.message}`,
        error: error
      });
    }
    setLoading(false);
  };

  const handleOpenDialog = (type) => {
    setDialogType(type);
    setFormData({});
    setDialogOpen(true);
  };

  const handleSubmitForm = async () => {
    try {
      switch (dialogType) {
        case 'checkEligibility':
          await api.post('/insurance/verify-eligibility', formData);
          break;
        case 'submitClaim':
          await api.post('/insurance/submit-claim', formData);
          break;
        case 'placeOrder':
          await api.post('/pharmacy/place-order', formData);
          break;
        case 'scheduleConsultation':
          await api.post('/telemedicine/schedule-consultation', formData);
          break;
      }
      setDialogOpen(false);
      fetchIntegrationData();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const renderInsuranceTab = () => (
    <Grid container spacing={3}>
      {/* Provider Status */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Insurance Provider Connections
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {insuranceData.providers.map(provider => (
                <Grid item xs={12} sm={6} md={3} key={provider.id}>
                  <Paper elevation={2} sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="subtitle1">{provider.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {provider.type === 'government' ? 'Government' : 'Private'}
                        </Typography>
                      </Box>
                      <Chip
                        icon={provider.status === 'active' ? <CheckIcon /> : <ErrorIcon />}
                        label={provider.status}
                        color={provider.status === 'active' ? 'success' : 'error'}
                        size="small"
                      />
                    </Box>
                    <Button
                      size="small"
                      onClick={() => handleTestIntegration('insurance', provider.id)}
                      sx={{ mt: 1 }}
                    >
                      Test Connection
                    </Button>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Stats */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Claims Statistics
            </Typography>
            <List>
              <ListItem>
                <ListItemText 
                  primary="Total Claims" 
                  secondary={insuranceData.stats.totalClaims}
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Approved Claims" 
                  secondary={insuranceData.stats.approvedClaims}
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="Total Amount" 
                  secondary={`₦${insuranceData.stats.totalAmount.toLocaleString()}`}
                />
              </ListItem>
            </List>
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="contained" 
                onClick={() => handleOpenDialog('checkEligibility')}
                sx={{ mr: 1 }}
              >
                Check Eligibility
              </Button>
              <Button 
                variant="outlined"
                onClick={() => handleOpenDialog('submitClaim')}
              >
                Submit Claim
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Claims */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Claims
            </Typography>
            <List>
              {insuranceData.claims.map(claim => (
                <ListItem key={claim.id}>
                  <ListItemText
                    primary={`${claim.id} - ${claim.patient}`}
                    secondary={`₦${claim.amount.toLocaleString()}`}
                  />
                  <Chip 
                    label={claim.status}
                    color={claim.status === 'approved' ? 'success' : 'warning'}
                    size="small"
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderPharmacyTab = () => (
    <Grid container spacing={3}>
      {/* Supplier Status */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Pharmacy Supplier Connections
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {pharmacyData.suppliers.map(supplier => (
                <Grid item xs={12} sm={6} md={3} key={supplier.id}>
                  <Paper elevation={2} sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle1">{supplier.name}</Typography>
                      <Chip
                        icon={supplier.status === 'connected' ? <CheckIcon /> : <ErrorIcon />}
                        label={supplier.status}
                        color={supplier.status === 'connected' ? 'success' : 'error'}
                        size="small"
                      />
                    </Box>
                    {supplier.lastSync && (
                      <Typography variant="caption" color="text.secondary">
                        Last sync: {new Date(supplier.lastSync).toLocaleTimeString()}
                      </Typography>
                    )}
                    <Button
                      size="small"
                      onClick={() => handleTestIntegration('pharmacy', supplier.id)}
                      sx={{ mt: 1 }}
                    >
                      Test Connection
                    </Button>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Inventory Status */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Inventory Status
            </Typography>
            <List>
              {pharmacyData.inventory.map(item => (
                <ListItem key={item.drug}>
                  <ListItemIcon>
                    {item.status === 'critical' ? 
                      <ErrorIcon color="error" /> : 
                      item.status === 'low' ?
                      <WarningIcon color="warning" /> :
                      <CheckIcon color="success" />
                    }
                  </ListItemIcon>
                  <ListItemText
                    primary={item.drug}
                    secondary={`Current stock: ${item.current} units`}
                  />
                </ListItem>
              ))}
            </List>
            <Button 
              variant="contained" 
              onClick={() => handleOpenDialog('placeOrder')}
              sx={{ mt: 2 }}
            >
              Place Order
            </Button>
          </CardContent>
        </Card>
      </Grid>

      {/* Auto-Reorder Rules */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Auto-Reorder Rules
            </Typography>
            <List>
              {pharmacyData.autoReorderRules.map((rule, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={rule.drug}
                    secondary={`Reorder ${rule.reorderQty} when below ${rule.reorderPoint} from ${rule.supplier}`}
                  />
                  <IconButton size="small">
                    <SettingsIcon />
                  </IconButton>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderTelemedicineTab = () => (
    <Grid container spacing={3}>
      {/* Provider Status */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Telemedicine Provider Connections
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {telemedicineData.providers.map(provider => (
                <Grid item xs={12} sm={6} md={4} key={provider.id}>
                  <Paper elevation={2} sx={{ p: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle1">{provider.name}</Typography>
                      <Chip
                        icon={provider.status === 'active' ? <CheckIcon /> : <ErrorIcon />}
                        label={provider.status}
                        color={provider.status === 'active' ? 'success' : 'error'}
                        size="small"
                      />
                    </Box>
                    <Box sx={{ mt: 1 }}>
                      {provider.features.map(feature => (
                        <Chip 
                          key={feature} 
                          label={feature} 
                          size="small" 
                          sx={{ mr: 0.5, mb: 0.5 }}
                        />
                      ))}
                    </Box>
                    <Button
                      size="small"
                      onClick={() => handleTestIntegration('telemedicine', provider.id)}
                      sx={{ mt: 1 }}
                    >
                      Test Connection
                    </Button>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Active Consultations */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Active Consultations
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              {telemedicineData.activeSessions} active video sessions
            </Alert>
            <List>
              {telemedicineData.consultations.map(consultation => (
                <ListItem key={consultation.id}>
                  <ListItemIcon>
                    {consultation.status === 'in_progress' && <VideoIcon color="primary" />}
                    {consultation.status === 'scheduled' && <ScheduleIcon />}
                    {consultation.status === 'completed' && <CheckIcon color="success" />}
                  </ListItemIcon>
                  <ListItemText
                    primary={`${consultation.patient} with ${consultation.doctor}`}
                    secondary={consultation.time}
                  />
                  <Chip 
                    label={consultation.status}
                    size="small"
                  />
                </ListItem>
              ))}
            </List>
            <Button 
              variant="contained" 
              onClick={() => handleOpenDialog('scheduleConsultation')}
              sx={{ mt: 2 }}
            >
              Schedule Consultation
            </Button>
          </CardContent>
        </Card>
      </Grid>

      {/* AI Triage Queue */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              AI Triage Queue
            </Typography>
            <List>
              {telemedicineData.triageQueue.map(triage => (
                <ListItem key={triage.id}>
                  <ListItemText
                    primary={triage.patient}
                    secondary={triage.symptoms}
                  />
                  <Chip 
                    label={triage.category}
                    color={triage.category === 'URGENT' ? 'error' : 'default'}
                    size="small"
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Partner Integrations
        </Typography>
        
        {testResults && (
          <Alert 
            severity={testResults.success ? 'success' : 'error'}
            onClose={() => setTestResults(null)}
            sx={{ mb: 2 }}
          >
            {testResults.message}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
            <Tab 
              label="Insurance/HMO" 
              icon={<HospitalIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="Pharmacy Suppliers" 
              icon={<PharmacyIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="Telemedicine" 
              icon={<VideoIcon />} 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {activeTab === 0 && renderInsuranceTab()}
            {activeTab === 1 && renderPharmacyTab()}
            {activeTab === 2 && renderTelemedicineTab()}
          </>
        )}

        {/* Dialog for forms */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {dialogType === 'checkEligibility' && 'Check Insurance Eligibility'}
            {dialogType === 'submitClaim' && 'Submit Insurance Claim'}
            {dialogType === 'placeOrder' && 'Place Pharmacy Order'}
            {dialogType === 'scheduleConsultation' && 'Schedule Telemedicine Consultation'}
          </DialogTitle>
          <DialogContent>
            {(dialogType === 'checkEligibility' || dialogType === 'submitClaim') && (
              <>
                <TextField
                  fullWidth
                  label="Patient ID"
                  value={formData.patientId || ''}
                  onChange={(e) => setFormData({...formData, patientId: e.target.value})}
                  margin="normal"
                />
                <FormControl fullWidth margin="normal">
                  <InputLabel>Provider</InputLabel>
                  <Select
                    value={formData.providerId || ''}
                    onChange={(e) => setFormData({...formData, providerId: e.target.value})}
                  >
                    {insuranceData.providers.map(p => (
                      <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}
            {dialogType === 'placeOrder' && (
              <>
                <TextField
                  fullWidth
                  label="Drug Name"
                  value={formData.drugName || ''}
                  onChange={(e) => setFormData({...formData, drugName: e.target.value})}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Quantity"
                  type="number"
                  value={formData.quantity || ''}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  margin="normal"
                />
              </>
            )}
            {dialogType === 'scheduleConsultation' && (
              <>
                <TextField
                  fullWidth
                  label="Patient Name"
                  value={formData.patientName || ''}
                  onChange={(e) => setFormData({...formData, patientName: e.target.value})}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Scheduled Time"
                  type="datetime-local"
                  value={formData.scheduledTime || ''}
                  onChange={(e) => setFormData({...formData, scheduledTime: e.target.value})}
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                />
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitForm} variant="contained">Submit</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}

export default PartnerIntegrations;
