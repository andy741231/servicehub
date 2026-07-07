import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import useFormStore from '../forms/store/formStore';
import FormRenderer from '../forms/components/FormRenderer';

export default function FormView() {
  const { formSlug } = useParams();
  const navigate = useNavigate();
  const { forms, addSubmission, fetchForm } = useFormStore();
  const [form, setForm] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadForm = async () => {
      setIsLoading(true);
      const foundForm = forms.find((f) => f.slug === formSlug || f.id === formSlug);
      if (foundForm) {
        setForm(foundForm);
        setIsLoading(false);
        return;
      }

      try {
        const apiForm = await fetchForm(formSlug);
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
  }, [formSlug, forms, fetchForm]);

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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-subtle mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text-base mb-2">Form Not Found</h1>
          <p className="text-muted mb-6">The form you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-subtle mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text-base mb-2">Form Not Found</h1>
          <p className="text-muted mb-6">The form you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return <FormRenderer form={form} onSubmit={handleSubmit} />;
}
