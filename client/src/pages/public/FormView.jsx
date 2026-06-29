import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import useFormStore from '../forms/store/formStore';
import FormRenderer from '../forms/components/FormRenderer';

export default function FormView() {
  const { formId } = useParams();
  const navigate = useNavigate();
  const { forms, addSubmission, fetchForm } = useFormStore();
  const [form, setForm] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadForm = async () => {
      setIsLoading(true);
      const foundForm = forms.find(f => f.id === formId);
      if (foundForm) {
        setForm(foundForm);
        setIsLoading(false);
        return;
      }

      try {
        const apiForm = await fetchForm(formId);
        if (!cancelled) {
          if (apiForm) {
            setForm(apiForm);
          } else {
            setNotFound(true);
          }
        }
      } catch (e) {
        console.error('Error fetching form:', e);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadForm();
    return () => { cancelled = true; };
  }, [formId, forms, fetchForm]);

  useEffect(() => {
    if (!form) return;
    const redirectUrl = form.theme?.redirectUrl;
    if (redirectUrl) {
      const timer = setTimeout(() => {
        window.location.href = redirectUrl;
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [form]);

  const handleSubmit = (submissionData) => {
    addSubmission(form.id, submissionData);
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Form Not Found</h1>
          <p className="text-gray-600 mb-6">The form you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Form Not Found</h1>
          <p className="text-gray-600 mb-6">The form you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return <FormRenderer form={form} onSubmit={handleSubmit} />;
}
