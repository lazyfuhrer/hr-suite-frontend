import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { addEmployees, addEmployeeEmployment, addEmployeeFinance, uploadUrl, submitOnboarding, getOnboardingStatus, updateOnboardingProfile } from '../../api/emoloyees/addEmployees';
import { getDepartments } from '../../api/departments';
import { useLayout } from '../../context/LayoutContext';

// Import Step Components
import ProfileStep from './steps/ProfileStep';
import EmploymentStep from './steps/EmploymentStep';
import PayrollStep from './steps/PayrollStep';
import ComplianceStep from './steps/ComplianceStep';
import { getPayrollSettings } from '../../api/payroll';

const AddEmployeeForm = ({ onBack, userId }) => {
    const { user } = useSelector((state) => state.auth);
    const isManager = String(user?.role || '').toLowerCase() === 'manager';
    const [currentStep, setCurrentStep] = useState(1);
    const [firstData, setFirstData] = useState(false);
    const [, setSecondData] = useState(false);
    const [, setThirdData] = useState(false);
    const [fourData, setFourData] = useState(false);
    const [createdUserId, setCreatedUserId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmittingStep4, setIsSubmittingStep4] = useState(false);

    // Use passed userId or locally created one
    const activeUserId = userId || createdUserId;
    const { setHeaderConfig } = useLayout();

    const onboardingDraftKey = (id) => `onboarding_draft_${id}`;

    const readLocalOnboardingDraft = (id) => {
        try {
            if (!id) return null;
            const raw = localStorage.getItem(onboardingDraftKey(id));
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch {
            return null;
        }
    };

    const writeLocalOnboardingDraft = (id, patch) => {
        try {
            if (!id || !patch) return;
            const prev = readLocalOnboardingDraft(id) || {};
            localStorage.setItem(onboardingDraftKey(id), JSON.stringify({ ...prev, ...patch }));
        } catch {
            // ignore
        }
    };

    const syncLatestOnboardingState = async (id) => {
        if (!id) return;
        try {
            const response = await getOnboardingStatus(id);
            const data = response?.data || response;
            if (!data) return;

            if (data.profile?.user) {
                const localDraft = readLocalOnboardingDraft(id) || {};

                const resolvedEmploymentType =
                    data.employment_details?.employment_type ||
                    localDraft.employmentType ||
                    'FULL_TIME';

                const resolvedWorkMode =
                    data.employment_details?.work_mode ||
                    localDraft.workMode ||
                    'ONSITE';

                const resolvedShiftMode =
                    localDraft.shiftMode ||
                    'day';

                setStep2Data(prev => ({
                    ...prev,
                    employeeId: data.employee_id || prev.employeeId,
                    designation: data.profile.user.designation || prev.designation,
                    dateOfJoining: data.profile.user.date_of_joining
                        ? data.profile.user.date_of_joining.split('T')[0]
                        : prev.dateOfJoining,
                    departmentId:
                        data.department?.id ||
                        data.employment_details?.department_id ||
                        localDraft.departmentId ||
                        prev.departmentId,
                    employmentType: resolvedEmploymentType,
                    workMode: resolvedWorkMode,
                    shiftMode: resolvedShiftMode
                }));
            }

            const salaryStructure = data.salary_structure;
            if (salaryStructure) {
                const meta = data.meta || {};
                const metaEarnings = Array.isArray(meta.earnings_items) ? meta.earnings_items : [];
                const metaDeductions = Array.isArray(meta.deductions_items) ? meta.deductions_items : [];
                setStep3Data(prev => ({
                    ...prev,
                    baseSalary: data.employment_details?.annual_ctc ?? prev.baseSalary,
                        otherAllowance:
                            data?.finance?.earnings?.other_allowance ??
                            data?.finance?.earnings?.otherAllowance ??
                            data?.earnings?.other_allowance ??
                            data?.earnings?.otherAllowance ??
                            prev.otherAllowance,
                    grossEarnings: salaryStructure.gross_salary ?? prev.grossEarnings,
                    netSalary: salaryStructure.net_salary ?? prev.netSalary,
                    earningsItems: metaEarnings.map((it) => ({
                        name: String(it?.name || ''),
                        amount: it?.amount === null || it?.amount === undefined ? '' : String(it.amount),
                    })),
                    deductionsItems: metaDeductions.map((it) => ({
                        name: String(it?.name || ''),
                        amount: it?.amount === null || it?.amount === undefined ? '' : String(it.amount),
                    })),
                }));
            }

            const documentsComplete = Boolean(data?.admin_step_completion?.documents_complete);
            if (documentsComplete) setFourData(true);
        } catch (err) {
            console.error("Failed to sync onboarding state:", err);
        }
    };

    useEffect(() => {
        setHeaderConfig({
            title: "Add New Employee",
            breadcrumb: [
                { label: 'Dashboard', path: '/dashboard' },
                { label: 'Employees', path: '/employees' },
                { label: 'Add New Employee', path: '/employees/add', active: true }],
            onBack: null
        });
    }, [setHeaderConfig])

    // Step 1: Personal & Contact Information
    const [step1Data, setStep1Data] = useState({
        firstName: '',
        lastName: '',
        employeeType: 'Employee', // Default
        email: '',
        phoneCountryCode: '+91',
        phoneNumber: '',
    });

    // Step 2: Employment Details
    const [step2Data, setStep2Data] = useState({
        departmentId: '',
        employeeId: '',
        designation: '',
        dateOfJoining: '',
        employmentType: 'FULL_TIME',
        workMode: 'ONSITE',
        shiftMode: 'day'
    });

    // Step 3: Payroll Details
    const [step3Data, setStep3Data] = useState({
        baseSalary: '',
        basicSalary: '',
        hra: '',
        otherAllowance: '',
        earningsItems: [],
        grossEarnings: '',
        employerPf: '',
        totalEmployerContributions: '',
        pf: '',
        professionalTax: '',
        incomeTax: '',
        esi: '',
        deductionsItems: [],
        totalDeductions: '',
        netSalary: '',
    });
    const [isPfManuallyEdited, setIsPfManuallyEdited] = useState(false);
    const [isEmployerPfManuallyEdited, setIsEmployerPfManuallyEdited] = useState(false);
    const [isBasicManuallyEdited, setIsBasicManuallyEdited] = useState(false);
    const [debouncedAnnualCtc, setDebouncedAnnualCtc] = useState('');
    const [payrollSettings, setPayrollSettings] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await getPayrollSettings();
                // getPayrollSettings() already returns axios res.data, so treat `res` as the root shape.
                const root = res ?? {};
                if (!root?.exists || !root?.data) {
                    if (!cancelled) setPayrollSettings(null);
                    return;
                }
                if (!cancelled) setPayrollSettings(root.data);
            } catch {
                if (!cancelled) setPayrollSettings(null);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    // Step 4: Allowances, Benefits & Documents
    const [step4Data, setStep4Data] = useState({
        allowances: {
            transportation: false,
            meal: false,
            internet: false,
        },
        benefits: {
            healthInsurance: false,
            lifeInsurance: false,
            companyDevice: false,
            trainingProgram: false,
            tuition: false,
            fitnessMembership: false,
            mentalHealthSupport: false,
        },
        documents: {
            cvPortfolio: null,
            id: null,
            contractAgreement: null,
            offerLetter: null,
        },
        activeEmployee: true,
        sendWelcomeEmail: true,
    });

    const [errors, setErrors] = useState({});
    const [netSalaryError, setNetSalaryError] = useState('');

    const buildFileMeta = (file, doc_category, doc_type) => ({
        file_name: file.name,
        content_type: file.type,
        file_size: file.size,
        doc_category,
        doc_type,
    });

    const [departments, setDepartments] = useState([]);




    // Fetch Departments on Component Mount
    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const response = await getDepartments();
                const departmentsList = response.data.data || [];

                setDepartments(departmentsList);
            } catch (error) {
                console.error("Failed to fetch departments", error);
                toast.error("Could not load departments");
            }
        };

        fetchDepartments();
    }, []); // Empty dependency array ensures this runs once when the form loads

    // Load from API if activeUserId (resume mode)
    useEffect(() => {
        if (!activeUserId) return;

        const loadResumeData = async () => {
            setIsLoading(true);
            try {
                const response = await getOnboardingStatus(activeUserId);
                // Handle both response formats: directly the data or wrapped in response.data
                const data = response.data || response;

                if (!data) return;


                let nextStep = 1;

                // Step 1 Check
                const step1Complete = !!(
                    (data.profile?.user?.first_name || data.profile?.user?.last_name) &&
                    (data.profile?.personal_email || data.profile?.user?.official_email) &&
                    data.profile?.personal_phone
                );

                // if (!step1Complete) {
                //     if (!data.profile?.user?.first_name) console.log("- First Name");
                //     if (!data.profile?.user?.last_name) console.log("- Last Name");
                //     if (!data.profile?.personal_email && !data.profile?.user?.official_email) console.log("- Email");
                //     if (!data.profile?.personal_phone) console.log("- Phone");
                // }

                if (data.profile) {
                    setStep1Data(prev => ({
                        ...prev,
                        firstName: data.profile.user?.first_name || '',
                        lastName: data.profile.user?.last_name || '',
                        employeeType: 'Employee', // Default or from API if available
                        email: data.profile.personal_email || data.profile.user?.official_email || '',
                        phoneNumber: data.profile.personal_phone ? data.profile.personal_phone : '', // Assuming no country code split for now or format is 'Code-Num'
                        phoneCountryCode: '+91', // Default
                    }));
                    if (step1Complete) {
                        setFirstData(true);
                        nextStep = 2;
                    }
                }

                // Step 2 Check
                const step2Complete = !!(
                    data.employee_id &&
                    data.profile?.user?.designation &&
                    data.profile?.user?.date_of_joining
                );

                // if (!step2Complete) {
                //     console.log("Step 2 Missing Fields:");
                //     if (!data.employee_id) console.log("- Employee ID");
                //     if (!data.profile?.user?.designation) console.log("- Designation");
                //     if (!data.profile?.user?.date_of_joining) console.log("- Date of Joining");
                // }


                if (data.profile?.user) {
                    const localDraft = readLocalOnboardingDraft(activeUserId) || {};

                    const resolvedEmploymentType =
                        data.employment_details?.employment_type ||
                        localDraft.employmentType ||
                        'FULL_TIME';

                    const resolvedWorkMode =
                        data.employment_details?.work_mode ||
                        localDraft.workMode ||
                        'ONSITE';

                    const resolvedShiftMode =
                        localDraft.shiftMode ||
                        'day';

                    setStep2Data(prev => ({
                        ...prev,
                        employeeId: data.employee_id || '',
                        designation: data.profile.user.designation || '',
                        dateOfJoining: data.profile.user.date_of_joining ? data.profile.user.date_of_joining.split('T')[0] : '',
                        departmentId:
                            data.department?.id ||
                            data.employment_details?.department_id ||
                            localDraft.departmentId ||
                            prev.departmentId,
                        employmentType: resolvedEmploymentType,
                        workMode: resolvedWorkMode,
                        shiftMode: resolvedShiftMode
                    }));
                    if (step2Complete) {
                        setSecondData(true);
                        if (nextStep === 2) nextStep = 3;
                    }
                }

                // Step 3 Check
                // Check if Payroll/Finance details are present (Gross & Net Salary)
                const salaryStructure = data.salary_structure;

                const step3Complete = !!(
                    (salaryStructure?.gross_salary && salaryStructure?.net_salary) ||
                    data.employment_details?.annual_ctc
                );

                if (salaryStructure || data.employment_details?.annual_ctc) {
                    const meta = data.meta || {};
                    const metaEarnings = Array.isArray(meta.earnings_items) ? meta.earnings_items : [];
                    const metaDeductions = Array.isArray(meta.deductions_items) ? meta.deductions_items : [];
                    setStep3Data(prev => ({
                        ...prev,
                        baseSalary: data.employment_details?.annual_ctc ?? prev.baseSalary,
                        otherAllowance:
                            data?.finance?.earnings?.other_allowance ??
                            data?.finance?.earnings?.otherAllowance ??
                            data?.earnings?.other_allowance ??
                            data?.earnings?.otherAllowance ??
                            prev.otherAllowance,
                        grossEarnings: salaryStructure?.gross_salary ?? prev.grossEarnings,
                        netSalary: salaryStructure?.net_salary ?? prev.netSalary,
                        earningsItems: metaEarnings.map((it) => ({
                            name: String(it?.name || ''),
                            amount: it?.amount === null || it?.amount === undefined ? '' : String(it.amount),
                        })),
                        deductionsItems: metaDeductions.map((it) => ({
                            name: String(it?.name || ''),
                            amount: it?.amount === null || it?.amount === undefined ? '' : String(it.amount),
                        })),
                    }));

                    if (step3Complete) {
                        setThirdData(true);
                        if (nextStep === 3) nextStep = 4;
                    }
                }

                // if (!step3Complete) {
                //     console.log("Step 3 Missing Fields:");
                //     if (!finance?.gross_salary && !payrollInfo?.annual_ctc) console.log("- Gross Salary / Annual CTC");
                //     if (!finance?.net_salary) console.log("- Net Salary");
                // }

                // if (!step3Complete) {
                //     console.log("Step 3 Missing Fields (Payroll):");
                //     if (!payrollInfo?.annual_ctc) console.log("- Annual CTC");
                //     if (!earnings?.basic_salary) console.log("- Basic Salary");
                //     if (!earnings?.hra) console.log("- HRA");
                // }


                // Step 4 Check
                if (data.benefits) {
                    setStep4Data(prev => ({
                        ...prev,
                        allowances: {
                            transportation: data.benefits.allowances?.transportation || false,
                            meal: data.benefits.allowances?.meal || false,
                            internet: data.benefits.allowances?.internet || false,
                        },
                        benefits: {
                            healthInsurance: data.benefits.benefits?.health_insurance || false,
                            lifeInsurance: data.benefits.benefits?.life_insurance || false,
                            companyDevice: data.benefits.benefits?.company_device || false,
                            trainingProgram: data.benefits.benefits?.training_program || false,
                            tuition: data.benefits.benefits?.tuition || false,
                            fitnessMembership: data.benefits.benefits?.fitness_membership || false,
                            mentalHealthSupport: data.benefits.benefits?.mental_health_support || false,
                        },
                    }));
                }

                const documentsComplete = Boolean(data?.admin_step_completion?.documents_complete);
                if (documentsComplete) {
                    setFourData(true);
                }

                // Determine Current Step
                // console.log("Auto-detected Step:", nextStep);
                setCurrentStep(nextStep);

            } catch (error) {
                console.error("Failed to load resume data", error);
                toast.error("Could not load existing data for resume.");
            } finally {
                setIsLoading(false);
            }
        };

        loadResumeData();
    }, [activeUserId]);

    useEffect(() => {
        if (payrollSettings) return;
        if (isPfManuallyEdited) return;
        const annual = parseFloat(step3Data.baseSalary) || 0;
        const calculatedPf = annual > 0 ? ((annual * 12) / 100).toFixed(2) : '';
        if (step3Data.pf !== calculatedPf) {
            setStep3Data(prev => ({ ...prev, pf: calculatedPf }));
        }
    }, [step3Data.baseSalary, isPfManuallyEdited, step3Data.pf]);

    useEffect(() => {
        if (payrollSettings) return;
        if (isEmployerPfManuallyEdited) return;
        const annual = parseFloat(step3Data.baseSalary) || 0;
        const calculatedPf = annual > 0 ? ((annual * 12) / 100).toFixed(2) : '';
        if (step3Data.employerPf !== calculatedPf) {
            setStep3Data(prev => ({ ...prev, employerPf: calculatedPf }));
        }
    }, [step3Data.baseSalary, isEmployerPfManuallyEdited, step3Data.employerPf]);

    // Debounce Annual CTC input so we don't auto-fill while user is typing.
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedAnnualCtc(step3Data.baseSalary);
        }, 400);
        return () => clearTimeout(timer);
    }, [step3Data.baseSalary]);

    // Default Basic Salary to 50% of Annual CTC unless user edits it.
    useEffect(() => {
        if (payrollSettings) return;
        if (isBasicManuallyEdited) return;
        const annual = parseFloat(debouncedAnnualCtc) || 0;
        if (annual <= 0) return;
        const nextBasic = String(Math.round(annual * 0.5));
        if (step3Data.basicSalary !== nextBasic && (step3Data.basicSalary === '' || parseFloat(step3Data.basicSalary) <= 0)) {
            setStep3Data(prev => ({ ...prev, basicSalary: nextBasic }));
        }
    }, [debouncedAnnualCtc, step3Data.basicSalary, isBasicManuallyEdited]);

    // Auto-prefill based on payroll settings whenever CTC changes (debounced).
    useEffect(() => {
        if (!payrollSettings) return;
        const ctc = parseFloat(debouncedAnnualCtc) || 0;
        if (ctc <= 0) return;

        const extraEarningsAnnual = Array.isArray(step3Data.earningsItems)
            ? step3Data.earningsItems.reduce((sum, it) => sum + (parseFloat(it?.amount) || 0), 0)
            : 0;
        const extraDeductionsAnnual = Array.isArray(step3Data.deductionsItems)
            ? step3Data.deductionsItems.reduce((sum, it) => sum + (parseFloat(it?.amount) || 0), 0)
            : 0;

        const basic = Math.round(((Number(payrollSettings.basic_pct) || 0) / 100) * ctc);
        const hra = Math.round(((Number(payrollSettings.hra_pct_of_basic) || 0) / 100) * basic);

        const employerPfCfg = payrollSettings.employer_pf || {};
        const employerPf =
            employerPfCfg.type === 'FIXED'
                ? (Number(employerPfCfg.value) || 0)
                : Math.round(((Number(employerPfCfg.value) || 0) / 100) * basic);

        let otherAllowance = ctc - (basic + hra + employerPf + extraEarningsAnnual);
        if (otherAllowance < 0) otherAllowance = 0;

        const gross = basic + hra + otherAllowance + extraEarningsAnnual;

        const employeePfCfg = payrollSettings.employee_pf || {};
        const employeePf =
            employeePfCfg.type === 'FIXED'
                ? (Number(employeePfCfg.value) || 0)
                : Math.round(((Number(employeePfCfg.value) || 0) / 100) * basic);

        const pt = Number(payrollSettings.professional_tax_annual) || 0;
        const totalDeductions = employeePf + pt + extraDeductionsAnnual;

        const rawNet = (gross - totalDeductions) / 12;
        const integerPart = Math.floor(rawNet);
        const decimalPart = rawNet - integerPart;
        const netMonthly = decimalPart > 0.5 ? integerPart + 1 : integerPart;

        setIsPfManuallyEdited(false);
        setIsEmployerPfManuallyEdited(false);
        setIsBasicManuallyEdited(false);

        setStep3Data(prev => ({
            ...prev,
            baseSalary: String(ctc),
            basicSalary: String(basic),
            hra: String(hra),
            employerPf: String(employerPf),
            otherAllowance: String(otherAllowance),
            pf: String(employeePf),
            professionalTax: String(pt),
            totalEmployerContributions: String(employerPf),
            grossEarnings: String(gross),
            totalDeductions: String(totalDeductions),
            netSalary: String(netMonthly),
        }));
    }, [payrollSettings, debouncedAnnualCtc, step3Data.earningsItems, step3Data.deductionsItems]);

    useEffect(() => {
        const basic = parseFloat(step3Data.basicSalary) || 0;
        const hra = parseFloat(step3Data.hra) || 0;
        const hasEarningsInput = step3Data.basicSalary !== '' && step3Data.hra !== '';

        const pf = parseFloat(step3Data.pf) || 0;
        const pt = parseFloat(step3Data.professionalTax) || 0;
        const otherAllowance = parseFloat(step3Data.otherAllowance) || 0;

        const extraEarningsAnnual = Array.isArray(step3Data.earningsItems)
            ? step3Data.earningsItems.reduce((sum, it) => sum + (parseFloat(it?.amount) || 0), 0)
            : 0;
        const extraDeductionsAnnual = Array.isArray(step3Data.deductionsItems)
            ? step3Data.deductionsItems.reduce((sum, it) => sum + (parseFloat(it?.amount) || 0), 0)
            : 0;

        const gross = basic + hra + otherAllowance + extraEarningsAnnual;
        if (!hasEarningsInput) {
            setNetSalaryError('');
            setStep3Data(prev => ({
                ...prev,
                grossEarnings: '',
                totalDeductions: '',
                netSalary: ''
            }));
            return;
        }

        const totalDeductions = pf + pt + extraDeductionsAnnual;
        const rawNet = (gross - totalDeductions) / 12;
        const intergerPart = Math.floor(rawNet);
        const decimalPart = rawNet - intergerPart;
        const net = decimalPart > 0.5 ? intergerPart + 1 : intergerPart;

        setNetSalaryError(
            net < 0 ? 'Net Salary cannot be negative. Please check earnings and deductions.' : ''
        );

        setStep3Data(prev => ({
            ...prev,
            grossEarnings: gross.toString(),
            totalDeductions: totalDeductions.toString(),
            netSalary: net.toString(),
            totalEmployerContributions: String(parseFloat(step3Data.employerPf) || 0),
        }));
    }, [
        step3Data.basicSalary,
        step3Data.hra,
        step3Data.otherAllowance,
        step3Data.earningsItems,
        step3Data.pf,
        step3Data.professionalTax,
        step3Data.deductionsItems,
        step3Data.employerPf,
    ]);

    const annualCtc = parseFloat(step3Data.baseSalary) || 0;
    const grossEarnings = parseFloat(step3Data.grossEarnings) || 0;
    const employerContrib = parseFloat(step3Data.totalEmployerContributions) || (parseFloat(step3Data.employerPf) || 0);
    const hasRequiredEarningsInputs = step3Data.basicSalary !== '' && step3Data.hra !== '';
    const isCtcMatching = annualCtc > 0 && Math.abs((grossEarnings + employerContrib) - annualCtc) < 0.01;
    const isStep3Locked =
        currentStep === 3 &&
        (!hasRequiredEarningsInputs || !isCtcMatching || !!netSalaryError);

    // Validation functions
    const normalizePhoneDigits = (value) => String(value || '').replace(/\D/g, '');
    const isValidIndiaMobile = (digits) => digits.length === 10 && /^[6-9]\d{9}$/.test(digits);

    const validateStep1 = () => {
        const newErrors = {};

        // Check First Name
        if (!step1Data.firstName || !step1Data.firstName.trim()) {
            newErrors.firstName = 'First Name is required';
            toast.error('First Name is required');
            return;
        }

        if (!step1Data.lastName || !step1Data.lastName.trim()) {
            newErrors.lastName = 'last Name is required';
            toast.error('Last Name is required');
            return;
        }
        // Check Employee Type
        if (!step1Data.employeeType) {
            newErrors.employeeType = 'Employee Type is required';
            toast.error('Employee Type is required');
            return;
        }

        // Check Email
        if (!step1Data.email || !step1Data.email.trim()) {
            newErrors.email = 'Email is required';
            toast.error('Email is required');
        } else if (!/\S+@\S+\.\S+/.test(step1Data.email)) {
            newErrors.email = 'Invalid email format';
            toast.error('Invalid email format');
            return;
        }

        // Check Phone Number
        if (!step1Data.phoneNumber || !step1Data.phoneNumber.trim()) {
            newErrors.phoneNumber = 'Phone number is required';
            toast.error('Phone number is required');
            return;
        }
        const phoneDigits = normalizePhoneDigits(step1Data.phoneNumber);
        if (!isValidIndiaMobile(phoneDigits)) {
            newErrors.phoneNumber = 'Enter a valid 10-digit mobile number';
            toast.error('Enter a valid 10-digit mobile number');
            return;
        }

        // Update the error state so the UI can show red borders if needed
        setErrors(newErrors);

        // Return true only if there are zero keys in the error object
        return Object.keys(newErrors).length === 0;
    };

    const validateStep2 = () => {
        const newErrors = {};

        if (!step2Data.employeeId || !step2Data.employeeId.trim()) {
            newErrors.employeeId = 'Required';
            toast.error('Employee ID is required');
            return;
        }
        if (!step2Data.designation || !step2Data.designation.trim()) {
            newErrors.designation = 'Required';
            toast.error('Job Title is required');
            return
        }
        if (!step2Data.dateOfJoining) {
            newErrors.dateOfJoining = 'Required';
            toast.error('Join Date is required');
            return
        }

        // Department remains optional as per your previous requirement

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateStep3 = () => {
        const newErrors = {};

        const normalizeItemNameKey = (value) => String(value || '').trim().toLowerCase();
        const hasDuplicateItemNames = (items) => {
            const seen = new Set();
            for (const it of Array.isArray(items) ? items : []) {
                const key = normalizeItemNameKey(it?.name);
                if (!key) continue;
                if (seen.has(key)) return true;
                seen.add(key);
            }
            return false;
        };

        if (!step3Data.baseSalary || parseFloat(step3Data.baseSalary) <= 0) {
            toast.error("Annual CTC is required")
            newErrors.baseSalary = 'Annual CTC is required';
            return
        }
        if (!step3Data.basicSalary || parseFloat(step3Data.basicSalary) <= 0) {
            toast.error("Basic CTC is required")
            newErrors.baseSalary = 'Basic CTC is required';
            return
        }

        if (!step3Data.hra || parseFloat(step3Data.hra) <= 0) {
            toast.error('HRA CTC is required')
            newErrors.baseSalary = 'HRA CTC is required';
            return
        }

        const annual = parseFloat(step3Data.baseSalary) || 0;
        const gross = parseFloat(step3Data.grossEarnings) || 0;
        const employer = parseFloat(step3Data.employerPf) || 0;
        if (annual <= 0 || Math.abs((gross + employer) - annual) >= 0.01) {
            toast.error('CTC must equal Gross Earnings + Employer Contributions');
            newErrors.baseSalary = 'CTC must equal Gross Earnings + Employer Contributions';
            return;
        }

        if (hasDuplicateItemNames(step3Data.earningsItems)) {
            toast.error('Earnings item names must be unique');
            return;
        }
        if (hasDuplicateItemNames(step3Data.deductionsItems)) {
            toast.error('Deductions item names must be unique');
            return;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const validateStep4 = () => {
        if (!step4Data.documents.offerLetter) {
            toast.error("Offer Letter is required");
            return false;
        }
        return true;
    };


    // Handle Next button
    const handleNext = async () => {
        let isValid = false;

        if (currentStep === 1) {
            isValid = validateStep1();

            if (isValid && firstData) {
                try {
                    if (!activeUserId) {
                        toast.error("User ID missing. Please redo Step 1.");
                        return;
                    }

                    const payload = {
                        email: step1Data.email,
                        firstName: step1Data.firstName,
                        lastName: step1Data.lastName,
                        employeeType: isManager ? 'employee' : step1Data.employeeType.toLowerCase(),
                        department_id: step2Data.departmentId || undefined,
                        phone: `${step1Data.phoneCountryCode}-${step1Data.phoneNumber}`,
                    };

                    await updateOnboardingProfile(activeUserId, payload);
                    await syncLatestOnboardingState(activeUserId);

                    toast.success('Personal information updated successfully');
                    setCurrentStep(2);
                } catch (error) {
                    console.error("Step 1 Update Error:", error);
                    toast.error(error.response?.data?.message || 'Failed to update personal information');
                }
            }
            if (isValid && firstData === false) {
                try {

                    // Inside handleNext for currentStep === 1
                    const payload = {
                        email: step1Data.email,
                        firstName: step1Data.firstName,
                        lastName: step1Data.lastName,
                        employeeType: isManager ? 'employee' : step1Data.employeeType.toLowerCase(),
                        phone: `${step1Data.phoneCountryCode}-${step1Data.phoneNumber}`,
                    };

                    const response = await addEmployees(payload);

                    if (response) {
                        if (response.id) {
                            setCreatedUserId(response.id);
                        }
                        if (response.employee_id) {
                            setStep2Data(prev => ({ ...prev, employeeId: response.employee_id }));
                        }

                        toast.success('Personal information saved successfully');
                        setFirstData(true);
                        setCurrentStep(2);
                    }
                } catch (error) {
                    console.error("API Error:", error);
                    const errorMessage = error.response?.data?.message || 'Failed to save personal information';
                    toast.error(errorMessage);
                }
            }
        } else if (currentStep === 2) {
            isValid = validateStep2();
            if (isValid) {
                try {
                    if (!activeUserId) {
                        toast.error("User ID missing. Please redo Step 1.");
                        return;
                    }

                    const employmentPayload = {
                        department_id: step2Data.departmentId,
                        designation: step2Data.designation,
                        date_of_joining: step2Data.dateOfJoining,
                        employment_type: step2Data.employmentType,
                        employeeId: step2Data.employeeId,
                        work_mode: step2Data.workMode,
                        shift_mode: step2Data.shiftMode
                    };

                    await addEmployeeEmployment(activeUserId, employmentPayload);
                    await syncLatestOnboardingState(activeUserId);
                    writeLocalOnboardingDraft(activeUserId, {
                        departmentId: step2Data.departmentId,
                        departmentName: departments?.find?.((d) => d.id === step2Data.departmentId)?.name,
                        shiftMode: step2Data.shiftMode,
                        employmentType: step2Data.employmentType,
                        workMode: step2Data.workMode,
                    });

                    toast.success("Employment details saved successfully!");
                    setSecondData(true);
                    setCurrentStep(3);

                } catch (error) {
                    console.error("Step 2 Error:", error);
                    const errorData = error.response?.data;
                    const existingUser = errorData?.existing_user;
                    const isEmployeeIdConflict =
                        String(errorData?.message || '').toLowerCase().includes('employeeid already exists') ||
                        Boolean(existingUser);

                    if (isEmployeeIdConflict) {
                        const existingName =
                            existingUser?.name ||
                            [existingUser?.first_name, existingUser?.last_name].filter(Boolean).join(' ').trim() ||
                            'another employee';

                        setErrors((prev) => ({
                            ...prev,
                            employeeId: 'Employee ID already exists',
                        }));
                        toast.error(`Employee ID already exists. Assigned to ${existingName}`);
                        return;
                    }

                    toast.error(errorData?.message || 'Failed to save employment details');
                }
            }
        } else if (currentStep === 3) {
            isValid = validateStep3();
            if (isValid) {
                try {
                    if (!activeUserId) {
                        toast.error("User ID missing. Please redo Step 1.");
                        return;
                    }

                    const financePayload = {
                        payroll_info: {
                            annual_ctc: step3Data.baseSalary.toString()
                        },
                        earnings: {
                            basic_salary: step3Data.basicSalary,
                            hra: step3Data.hra,
                            other_allowance: String(step3Data.otherAllowance || 0),
                            gross_earnings: step3Data.grossEarnings
                        },
                        earnings_items: (Array.isArray(step3Data.earningsItems) ? step3Data.earningsItems : [])
                            .filter((it) => String(it?.name || '').trim() && Number(it?.amount) > 0)
                            .map((it) => ({ name: String(it.name).trim(), amount: Number(it.amount) })),
                        employer_contributions: {
                            pf: String(step3Data.employerPf || 0),
                            total_contributions: String(step3Data.totalEmployerContributions || step3Data.employerPf || 0),
                        },
                        deductions: {
                            pf: step3Data.pf,
                            professional_tax: step3Data.professionalTax,
                            total_deductions: step3Data.totalDeductions
                        },
                        deductions_items: (Array.isArray(step3Data.deductionsItems) ? step3Data.deductionsItems : [])
                            .filter((it) => String(it?.name || '').trim() && Number(it?.amount) > 0)
                            .map((it) => ({ name: String(it.name).trim(), amount: Number(it.amount) })),
                        net_payable: {
                            salary_per_month: step3Data.netSalary
                        }
                    };

                    await addEmployeeFinance(activeUserId, financePayload);
                    await syncLatestOnboardingState(activeUserId);
                    writeLocalOnboardingDraft(activeUserId, {
                        earningsItems: step3Data.earningsItems,
                        deductionsItems: step3Data.deductionsItems,
                    });

                    toast.success("Payroll details saved successfully!");
                    setThirdData(true);
                    setCurrentStep(4);
                } catch (error) {
                    console.error("Step 3 Error:", error);
                    toast.error(error.response?.data?.message || "Failed to save payroll");
                }
            }
        }
    };

    const documentMetaPayload = [];

    if (step4Data.documents.offerLetter) {
        documentMetaPayload.push(
            buildFileMeta(
                step4Data.documents.offerLetter,
                'LEGAL',
                'SIGNED_OFFER_LETTER'
            )
        );
    }

    if (step4Data.documents.cvPortfolio) {
        documentMetaPayload.push(
            buildFileMeta(
                step4Data.documents.cvPortfolio,
                'EXPERIENCE',
                'CV'
            )
        );
    }

    if (step4Data.documents.id) {
        documentMetaPayload.push(
            buildFileMeta(
                step4Data.documents.id,
                'IDENTITY',
                'IDENTITY_PROOF'
            )
        );
    }

    if (step4Data.documents.contractAgreement) {
        documentMetaPayload.push(
            buildFileMeta(
                step4Data.documents.contractAgreement,
                'LEGAL',
                'CONTRACT_AGREEMENT'
            )
        );
    }

    // Handle Previous button
    const handlePrevious = () => {
        const prevStep = currentStep - 1;
        // Logic to restore local state is handled by React state
        setCurrentStep(Math.max(1, prevStep));
    };

    // Skip payroll (Step 3) and proceed to compliance
    const handleSkipStep3 = () => {
        setCurrentStep(4);
    };

    // Handle Submit (Step 4)
    const handleSubmit = async () => {
        if (isSubmittingStep4) return;
        try {
            if (!validateStep4()) return;
            if (!activeUserId) {
                toast.error("User ID missing. Please redo Step 1.");
                return;
            }
            setIsSubmittingStep4(true);

            // --- STEP 1: Upload Documents to get URLs ---
            const formData = new FormData();

            // Collect files that exist
            const docsToUpload = [
                { file: step4Data.documents.offerLetter, type: 'OFFER_LETTER_URL' },
                { file: step4Data.documents.cvPortfolio, type: 'CV_URL' },
                { file: step4Data.documents.id, type: 'ID_URL' }, // matched to your compliance keys
                { file: step4Data.documents.contractAgreement, type: 'CONTRACT_AGREEMENT_URL' }
            ].filter(item => item.file !== null);

            if (docsToUpload.length === 0) {
                toast.error("Please upload at least one document");
                return;
            }

            // Append files and their corresponding types
            const docTypes = [];
            docsToUpload.forEach(item => {
                formData.append('files', item.file);
                docTypes.push(item.type);
            });

            formData.append('doc_category', 'IDENTITY');
            formData.append('doc_types', JSON.stringify(docTypes));
            const docRes = await uploadUrl(activeUserId, formData);

            // Map the response URLs to the keys required by the Compliance API
            const uploadedDocs = docRes.data.documents;
            const docMap = {};
            uploadedDocs.forEach(doc => {
                if (doc.doc_type === 'OFFER_LETTER_URL') docMap.offer_letter_url = doc.file_url;
                if (doc.doc_type === 'CV_URL') docMap.cv_url = doc.file_url;
                if (doc.doc_type === 'ID_URL') docMap.id_url = doc.file_url;
                if (doc.doc_type === 'CONTRACT_AGREEMENT_URL') docMap.contract_agreement_url = doc.file_url;
            });

            // --- STEP 2: Send Compliance Data ---
            const compliancePayload = {
                documents: docMap,
                allowances: {
                    transportation: step4Data.allowances.transportation,
                    meal: step4Data.allowances.meal,
                    internet: step4Data.allowances.internet,
                },
                benefits: {
                    health_insurance: step4Data.benefits.healthInsurance,
                    life_insurance: step4Data.benefits.lifeInsurance,
                    company_device: step4Data.benefits.companyDevice,
                    training_program: step4Data.benefits.trainingProgram,
                    tuition: step4Data.benefits.tuition,
                    fitness_membership: step4Data.benefits.fitnessMembership,
                    mental_health_support: step4Data.benefits.mentalHealthSupport,
                },
                active_employee: true,
                send_welcome_email: true
            };

            const complianceRes = await submitOnboarding(activeUserId, compliancePayload);

            if (complianceRes?.status >= 200 && complianceRes?.status < 300) {
                toast.success('Employee onboarded successfully 🎉');
                clearAllData();
                resetForm();
                setFourData(true);
                setCurrentStep(1);
            }

        } catch (err) {
            console.error("Submission Error:", err);
            toast.error(err.response?.data?.message || 'Onboarding failed at compliance step');
        } finally {
            setIsSubmittingStep4(false);
        }
    };

    // Clear all localStorage
    const clearAllData = () => {
        setCreatedUserId(null);
    };

    // Reset all form data
    const resetForm = () => {
        setStep1Data({
            firstName: '',
            lastName: '',
            employeeType: 'Employee',
            email: '',
            phoneCountryCode: '+91',
            phoneNumber: '',
        });
        setStep2Data({
            departmentId: '',
            employeeId: '',
            designation: '',
            dateOfJoining: '',
            employmentType: 'FULL_TIME',
            workMode: 'ONSITE',
            shiftMode: 'day'
        });
        setStep3Data({
            baseSalary: '',
            basicSalary: '',
            hra: '',
            earningsItems: [],
            grossEarnings: '',
            pf: '',
            professionalTax: '',
            incomeTax: '',
            esi: '',
            deductionsItems: [],
            totalDeductions: '',
            netSalary: '',
        });
        setIsPfManuallyEdited(false);
        setIsBasicManuallyEdited(false);
        setStep4Data({
            allowances: {
                transportation: false,
                meal: false,
                internet: false,
            },
            benefits: {
                healthInsurance: false,
                lifeInsurance: false,
                companyDevice: false,
                trainingProgram: false,
                tuition: false,
                fitnessMembership: false,
                mentalHealthSupport: false,
            },
            documents: {
                cvPortfolio: null,
                id: null,
                contractAgreement: null,
                offerLetter: null,
            },
            activeEmployee: true,
            sendWelcomeEmail: true,
        });
        setFirstData(false);
        setSecondData(false);
        setThirdData(false);
        setFourData(false);
        setErrors({});
    };

    // Handle Save as Draft (Only for Step 4)
    const handleSaveAsDraft = async () => {
        try {
            toast.success('Draft saved successfully');
            // Clear and reset
            clearAllData();
            resetForm();
            setCurrentStep(1);

        } catch (error) {
            console.error('Save draft error:', error);
            toast.error('Failed to save draft');
        }
    };

    // Handle Discard
    const handleDiscard = () => {
        if (window.confirm('Are you sure you want to discard all changes? This will clear all data and return to the beginning.')) {
            // Clear all and reset
            clearAllData();
            resetForm();
            setCurrentStep(1);
            toast.success('Form reset');
        }
    };

    // Handle file upload
    const handleFileUpload = (documentType, file) => {
        if (file && file.size <= 2.5 * 1024 * 1024) {
            setStep4Data(prev => ({
                ...prev,
                documents: { ...prev.documents, [documentType]: file }
            }));
            toast.success(`${file.name} uploaded successfully`);
        } else {
            toast.error('File size must be less than 2.5MB');
        }
    };

    // Handle file removal
    const handleRemoveFile = (documentType) => {
        setStep4Data(prev => ({
            ...prev,
            documents: {
                ...prev.documents,
                [documentType]: null
            }
        }));
        toast.success('File removed');
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--brand-primary)]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-3 p-6">
            {/* Header */}
            <div className="flex items-center gap-2">
                <button
                    onClick={onBack} // <--- Trigger onBack
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Left Sidebar: Steps Progress */}
                <div className="col-span-12 lg:col-span-3">
                    <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                        <h3 className="font-bold text-lg text-gray-800 mb-2">Register New Employee</h3>
                        <p className="text-xs text-gray-500 mb-6 font-medium">Enter all required employment details to formally add a new member to your organization.</p>

                        <div className="space-y-4">
                            {/* Step 1 */}
                            <div className={`flex items-start gap-3 ${currentStep >= 1 ? '' : 'opacity-40'}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${currentStep === 1 ? 'bg-[var(--brand-primary)] text-white' : currentStep > 1 ? 'bg-[var(--brand-primary)] text-white' : 'bg-gray-100 text-gray-400'}`}>
                                    {currentStep > 1 ? '✓' : '1'}
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900">Personal & Contact Information</h4>
                                    <p className="text-xs text-gray-500 mt-0.5 font-medium">Basic details</p>
                                </div>
                            </div>

                            {/* Connector Line */}
                            <div className="ml-5 h-8 w-0.5 bg-gray-200"></div>

                            {/* Step 2 */}
                            <div className={`flex items-start gap-3 ${currentStep >= 2 ? '' : 'opacity-40'}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${currentStep === 2 ? 'bg-[var(--brand-primary)] text-white' : currentStep > 2 ? 'bg-[var(--brand-primary)] text-white' : 'bg-gray-100 text-gray-400'}`}>
                                    {currentStep > 2 ? '✓' : '2'}
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900">Employment Details</h4>
                                    <p className="text-xs text-gray-500 mt-0.5 font-medium">Job info</p>
                                </div>
                            </div>

                            {/* Connector Line */}
                            <div className="ml-5 h-8 w-0.5 bg-gray-200"></div>

                            {/* Step 3 */}
                            <div className={`flex items-start gap-3 ${currentStep >= 3 ? '' : 'opacity-40'}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${currentStep === 3 ? 'bg-[var(--brand-primary)] text-white' : currentStep > 3 ? 'bg-[var(--brand-primary)] text-white' : 'bg-gray-100 text-gray-400'}`}>
                                    {currentStep > 3 ? '✓' : '3'}
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900">Payroll Details</h4>
                                    <p className="text-xs text-gray-500 mt-0.5 font-medium">Salary & bank info</p>
                                </div>
                            </div>

                            {/* Connector Line */}
                            <div className="ml-5 h-8 w-0.5 bg-gray-200"></div>

                            {/* Step 4 */}
                            <div className={`flex items-start gap-3 ${currentStep >= 4 ? '' : 'opacity-40'}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${currentStep === 4 ? 'bg-[var(--brand-primary)] text-white' : 'bg-gray-100 text-gray-400'}`}>
                                    4
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900">Allowances, Benefits & Documents</h4>
                                    <p className="text-xs text-gray-500 mt-0.5 font-medium">Perks & files</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Form Content */}
                <div className="col-span-12 lg:col-span-9">
                    <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-sm">
                        {/* Step Indicator */}
                        <div className="mb-6">
                            <p className="text-sm text-gray-500 font-medium">Step {currentStep}/4</p>
                        </div>

                        {/* Step Components */}
                        {currentStep === 1 && (
                            <ProfileStep
                                step1Data={step1Data}
                                setStep1Data={setStep1Data}
                                errors={errors}
                                isManager={isManager}
                            />
                        )}

                        {currentStep === 2 && (
                            <EmploymentStep
                                step2Data={step2Data}
                                setStep2Data={setStep2Data}
                                errors={errors}
                                departments={departments}
                            />
                        )}

                        {currentStep === 3 && (
                            <PayrollStep
                                step3Data={step3Data}
                                setStep3Data={setStep3Data}
                                payrollSettings={payrollSettings}
                                onBasicChange={(value) => {
                                    setIsBasicManuallyEdited(true);
                                    setStep3Data(prev => ({ ...prev, basicSalary: value }));
                                }}
                                onPfChange={(value) => {
                                    setIsPfManuallyEdited(true);
                                    setStep3Data(prev => ({ ...prev, pf: value }));
                                }}
                                onEmployerPfChange={(value) => {
                                    setIsEmployerPfManuallyEdited(true);
                                    setStep3Data(prev => ({ ...prev, employerPf: value }));
                                }}
                                errors={errors}
                                showGrossMismatchHint={hasRequiredEarningsInputs && annualCtc > 0 && !isCtcMatching}
                                disableDeductions={!hasRequiredEarningsInputs || !isCtcMatching}
                                netSalaryError={netSalaryError}
                            />
                        )}

                        {currentStep === 4 && (
                            <ComplianceStep
                                step4Data={step4Data}
                                setStep4Data={setStep4Data}
                                handleFileUpload={handleFileUpload}
                                handleRemoveFile={handleRemoveFile}
                            />
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-8 pt-6 border-t border-gray-100">
                            {/* Left Side: Discard and Save as Draft (only for Step 4) */}
                            <div className="flex flex-wrap gap-3">
                                {currentStep < 4 ? (
                                    <button
                                        onClick={handleDiscard}
                                        className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                                    >
                                        Discard
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={handleDiscard}
                                            className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                                        >
                                            Discard
                                        </button>
                                        <button
                                            onClick={handleSaveAsDraft}
                                            className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                                        >
                                            Save as Draft
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Right Side: Previous and Next/Submit */}
                            <div className="flex flex-wrap gap-3">
                                {currentStep > 1 && (
                                    <button
                                        onClick={handlePrevious}
                                        className="px-6 py-2.5 bg-[var(--brand-soft-alt)] border border-[var(--brand-soft-border)] text-gray-700 rounded-lg text-sm font-semibold hover:bg-[var(--brand-soft)] transition-colors"
                                    >
                                        Previous
                                    </button>
                                )}

                                {currentStep === 3 && (
                                    <button
                                        type="button"
                                        onClick={handleSkipStep3}
                                        className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                                    >
                                        Skip
                                    </button>
                                )}

                                {currentStep < 4 ? (
                                    <button
                                        disabled={isStep3Locked}
                                        onClick={currentStep === 4 ? handleSubmit : handleNext}
                                        className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors ${isStep3Locked
                                            ? 'bg-gray-300 text-white cursor-not-allowed'
                                            : 'bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-strong)]'
                                            }`}
                                    >
                                        Next
                                    </button>
                                ) : (
                                    <button
                                        disabled={fourData === true || isSubmittingStep4}
                                        onClick={handleSubmit}
                                        className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors ${fourData === true || isSubmittingStep4
                                            ? 'bg-gray-300 text-white cursor-not-allowed'
                                            : 'bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-strong)]'
                                            }`}
                                    >
                                        {isSubmittingStep4 ? 'Submitting...' : 'Submit'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddEmployeeForm;
